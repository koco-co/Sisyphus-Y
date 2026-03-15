"""B-AICONF-08 — Prompt 配置 API 测试"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import ASGITransport, AsyncClient


class TestPromptEndpoints:
    """测试 Prompt 管理 API。"""

    async def test_reset_prompt_supports_post_alias(self):
        """POST /api/ai-config/prompts/{module}/reset 应兼容前端现有调用。"""
        mock_service_instance = AsyncMock()
        mock_service_instance.reset_prompt = AsyncMock()

        with patch("app.modules.ai_config.router.PromptConfigService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post("/api/ai-config/prompts/diagnosis/reset")

            app.dependency_overrides.clear()

        assert resp.status_code == 204

    async def test_rollback_prompt_endpoint(self):
        """POST /api/ai-config/prompts/{module}/rollback/{history_id} 应返回回滚后的 Prompt。"""
        history_id = uuid.uuid4()
        mock_prompt = MagicMock()
        mock_prompt.id = uuid.uuid4()
        mock_prompt.module = "diagnosis"
        mock_prompt.system_prompt = "rolled back prompt"
        mock_prompt.is_customized = True
        mock_prompt.version = 4
        mock_prompt.created_at = datetime.now(UTC)
        mock_prompt.updated_at = datetime.now(UTC)

        mock_service_instance = AsyncMock()
        mock_service_instance.rollback_prompt = AsyncMock(return_value=mock_prompt)

        with patch("app.modules.ai_config.router.PromptConfigService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(f"/api/ai-config/prompts/diagnosis/rollback/{history_id}")

            app.dependency_overrides.clear()

        assert resp.status_code == 200
        assert resp.json()["module"] == "diagnosis"
        assert resp.json()["system_prompt"] == "rolled back prompt"
