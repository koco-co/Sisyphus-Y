"""Products router API regression tests."""

from __future__ import annotations

import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import ASGITransport, AsyncClient


class TestRequirementDetailEndpoint:
    async def test_get_requirement_detail_endpoint_returns_requirement(self):
        requirement_id = uuid.uuid4()
        iteration_id = uuid.uuid4()

        mock_requirement = MagicMock()
        mock_requirement.id = requirement_id
        mock_requirement.iteration_id = iteration_id
        mock_requirement.req_id = "REQ-001"
        mock_requirement.title = "Hydrated Requirement"
        mock_requirement.status = "draft"
        mock_requirement.version = 3
        mock_requirement.content_ast = {"raw_text": "hello"}
        mock_requirement.frontmatter = {"priority": "P0"}
        mock_requirement.product_name = None
        mock_requirement.iteration_name = None
        mock_requirement.created_at = datetime.fromisoformat("2024-01-01T00:00:00")
        mock_requirement.updated_at = datetime.fromisoformat("2024-01-02T00:00:00")

        mock_service_instance = AsyncMock()
        mock_service_instance.get_requirement = AsyncMock(return_value=mock_requirement)

        with patch("app.modules.products.router.RequirementService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.get(f"/api/products/requirements/{requirement_id}")

            app.dependency_overrides.clear()

        assert resp.status_code == 200
        payload = resp.json()
        assert payload["id"] == str(requirement_id)
        assert payload["title"] == "Hydrated Requirement"
        assert payload["req_id"] == "REQ-001"
        assert payload["frontmatter"] == {"priority": "P0"}
