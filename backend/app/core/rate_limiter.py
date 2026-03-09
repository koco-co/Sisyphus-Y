"""基于 Redis 滑动窗口的 API 限流中间件"""

from __future__ import annotations

import logging
import time

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response

from app.core.redis_client import get_redis_client

logger = logging.getLogger(__name__)

# 路由前缀 → (最大请求数, 窗口秒数)
_ROUTE_LIMITS: dict[str, tuple[int, int]] = {
    "/api/generation/": (10, 60),  # LLM 生成类：10 次/分钟
    "/api/diagnosis/": (10, 60),
    "/api/scene-map/generate": (10, 60),
}
_DEFAULT_LIMIT: tuple[int, int] = (100, 60)  # 普通 API：100 次/分钟


def _get_limit(path: str) -> tuple[int, int]:
    """根据路由路径返回 (max_requests, window_seconds)。"""
    for prefix, limit in _ROUTE_LIMITS.items():
        if path.startswith(prefix):
            return limit
    return _DEFAULT_LIMIT


def _get_client_id(request: Request) -> str:
    """提取客户端标识：优先用 Authorization token，回退到 IP。"""
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        return f"token:{auth[7:32]}"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return f"ip:{forwarded.split(',')[0].strip()}"
    host = request.client.host if request.client else "unknown"
    return f"ip:{host}"


async def rate_limit_middleware(request: Request, call_next: RequestResponseEndpoint) -> Response:
    """滑动窗口限流中间件。"""
    path = request.url.path

    # 跳过健康检查和文档端点
    if path in ("/health", "/docs", "/openapi.json", "/redoc"):
        return await call_next(request)

    max_requests, window = _get_limit(path)
    client_id = _get_client_id(request)
    redis_key = f"rate_limit:{client_id}:{path.split('/')[2] if path.startswith('/api/') else 'default'}"

    try:
        redis = get_redis_client()
        now = time.time()
        window_start = now - window

        pipe = redis.pipeline()
        pipe.zremrangebyscore(redis_key, 0, window_start)
        pipe.zadd(redis_key, {str(now): now})
        pipe.zcard(redis_key)
        pipe.expire(redis_key, window)
        results = await pipe.execute()

        current_count: int = results[2]

        if current_count > max_requests:
            logger.warning("限流触发: %s %s (%d/%d)", client_id, path, current_count, max_requests)
            return JSONResponse(
                status_code=429,
                content={"detail": "请求过于频繁，请稍后重试"},
                headers={
                    "Retry-After": str(window),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max(0, max_requests - current_count))
        return response

    except Exception:
        logger.warning("限流组件异常，放行请求", exc_info=True)
        return await call_next(request)
