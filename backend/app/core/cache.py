"""Redis 缓存策略 — 通用 get/set/delete + 装饰器"""

from __future__ import annotations

import functools
import json
import logging
from collections.abc import Callable
from typing import Any

from app.core.redis_client import get_redis_client

logger = logging.getLogger(__name__)


async def cache_get(key: str) -> Any | None:
    """读取缓存，返回反序列化后的对象或 None。"""
    redis = get_redis_client()
    data = await redis.get(key)
    if data is None:
        return None
    try:
        return json.loads(data)
    except (json.JSONDecodeError, TypeError):
        logger.warning("缓存反序列化失败，key=%s", key)
        return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """写入缓存，默认 TTL 300s。"""
    redis = get_redis_client()
    await redis.set(key, json.dumps(value, default=str, ensure_ascii=False), ex=ttl)


async def cache_delete(key: str) -> None:
    """删除单个缓存 key。"""
    redis = get_redis_client()
    await redis.delete(key)


async def cache_delete_pattern(pattern: str) -> None:
    """按通配符批量删除缓存 key（SCAN 安全模式）。"""
    redis = get_redis_client()
    keys: list[str] = []
    async for key in redis.scan_iter(pattern):
        keys.append(key)
    if keys:
        await redis.delete(*keys)


def cached(prefix: str, ttl: int = 300, key_builder: Callable[..., str] | None = None):
    """异步函数缓存装饰器。

    Usage::

        @cached("analytics:overview", ttl=120)
        async def get_quality_overview(self, iteration_id=None):
            ...
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                parts = [prefix]
                # 跳过 self 参数
                for a in args[1:]:
                    parts.append(str(a) if a is not None else "_")
                for k, v in sorted(kwargs.items()):
                    parts.append(f"{k}={v}" if v is not None else f"{k}=_")
                cache_key = ":".join(parts)

            hit = await cache_get(cache_key)
            if hit is not None:
                return hit

            result = await func(*args, **kwargs)
            await cache_set(cache_key, result, ttl=ttl)
            return result

        wrapper.cache_prefix = prefix  # type: ignore[attr-defined]
        return wrapper

    return decorator
