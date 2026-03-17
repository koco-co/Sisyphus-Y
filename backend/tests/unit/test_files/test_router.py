"""Unit tests for files API endpoint."""

import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_serve_file_returns_redirect():
    """Test that /api/files/{bucket}/{path} returns 302 redirect."""
    from fastapi.testclient import TestClient
    from app.main import app

    with patch("app.modules.files.router.get_image_url") as mock_get_url:
        mock_get_url.return_value = "https://minio.example.com/presigned-url"

        client = TestClient(app)
        response = client.get("/api/files/sisyphus-images/images/test/image.png", follow_redirects=False)

        assert response.status_code == 302
        mock_get_url.assert_called_once_with("sisyphus-images/images/test/image.png", expires_hours=24)

@pytest.mark.asyncio
async def test_serve_file_not_found():
    """Test that /api/files/invalid returns 404."""
    from fastapi.testclient import TestClient
    from app.main import app

    with patch("app.modules.files.router.get_image_url") as mock_get_url:
        mock_get_url.side_effect = Exception("File not found")

        client = TestClient(app)
        response = client.get("/api/files/invalid/path")

        assert response.status_code == 404
