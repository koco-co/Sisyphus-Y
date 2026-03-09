"""MinIO 客户端封装 — 懒加载单例"""

from __future__ import annotations

from functools import lru_cache

from minio import Minio

from app.core.config import settings


@lru_cache
def get_minio_client() -> Minio:
    """返回 MinIO 客户端单例（懒加载）。"""
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=False,
    )


def ensure_bucket(bucket: str | None = None) -> None:
    """确保 Bucket 存在，不存在则自动创建。"""
    client = get_minio_client()
    bucket_name = bucket or settings.minio_bucket
    if not client.bucket_exists(bucket_name):
        client.make_bucket(bucket_name)
