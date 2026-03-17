"""Files API — MinIO file proxy access endpoint."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from app.engine.uda.image_handler import get_image_url

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/{bucket}/{path:path}")
async def serve_file(bucket: str, path: str):
    """
    Proxy MinIO file access, returning a presigned URL redirect.

    Args:
        bucket: MinIO bucket name (e.g., sisyphus-images)
        path: Object path (e.g., images/req-id/hash.png)

    Returns:
        302 redirect to presigned URL

    Raises:
        404: File not found or unable to generate URL
    """
    object_path = f"{bucket}/{path}"
    try:
        url = get_image_url(object_path, expires_hours=24)
        return RedirectResponse(url=url, status_code=302)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found: {e!s}") from None
