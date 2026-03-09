"""Redis 客户端封装 — 懒加载单例"""

from __future__ import annotations

from functools import lru_cache

from redis.asyncio import Redis

from app.core.config import settings


@lru_cache
def get_redis_client() -> Redis:  # type: ignore[type-arg]
    """返回 Redis 异步客户端单例（懒加载）。"""
    return Redis.from_url(
        settings.redis_url,
        decode_responses=True,
        max_connections=20,
    )


async def close_redis() -> None:
    """关闭 Redis 连接。"""
    client = get_redis_client()
    await client.aclose()
