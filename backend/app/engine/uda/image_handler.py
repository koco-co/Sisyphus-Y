"""图片归档处理器 — 外链抓取 + MinIO 持久化"""

from __future__ import annotations

import hashlib
import logging
import mimetypes
import re
from io import BytesIO
from pathlib import Path

import httpx

from app.core.minio_client import ensure_bucket, get_minio_client

logger = logging.getLogger(__name__)

BUCKET_NAME = "sisyphus-images"
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg"}

IMAGE_URL_PATTERN = re.compile(r"!\[([^\]]*)\]\((https?://[^\)]+)\)")


# ── 图片归档 ──────────────────────────────────────────────────────────


async def archive_image(
    file_bytes: bytes,
    original_filename: str,
    requirement_id: str | None = None,
) -> str:
    """归档图片到 MinIO，返回对象路径"""
    ext = Path(original_filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"不支持的图片格式: {ext}")

    content_hash = hashlib.md5(file_bytes).hexdigest()  # noqa: S324
    object_name = f"images/{requirement_id or 'global'}/{content_hash}{ext}"

    client = get_minio_client()
    ensure_bucket(BUCKET_NAME)

    content_type = mimetypes.guess_type(original_filename)[0] or "application/octet-stream"
    client.put_object(
        BUCKET_NAME,
        object_name,
        BytesIO(file_bytes),
        length=len(file_bytes),
        content_type=content_type,
    )
    return f"{BUCKET_NAME}/{object_name}"


def get_image_url(object_path: str, expires_hours: int = 24) -> str:
    """生成临时访问 URL"""
    from datetime import timedelta

    client = get_minio_client()
    bucket, _, key = object_path.partition("/")
    return client.presigned_get_object(bucket, key, expires=timedelta(hours=expires_hours))


# ── 外链图片抓取 ─────────────────────────────────────────────────────


async def fetch_and_archive_external_images(
    markdown_content: str,
    requirement_id: str | None = None,
) -> str:
    """扫描 Markdown 内容中的外链图片，下载并归档到 MinIO，替换 URL"""
    matches = IMAGE_URL_PATTERN.findall(markdown_content)
    if not matches:
        return markdown_content

    result = markdown_content
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as http:
        for _alt_text, url in matches:
            try:
                resp = await http.get(url)
                resp.raise_for_status()
                filename = url.split("/")[-1].split("?")[0] or "image.png"
                archived_path = await archive_image(resp.content, filename, requirement_id)
                new_url = f"/api/files/{archived_path}"
                result = result.replace(url, new_url)
            except Exception:
                logger.warning("外链图片抓取失败，保留原链接: %s", url)
                continue

    return result
