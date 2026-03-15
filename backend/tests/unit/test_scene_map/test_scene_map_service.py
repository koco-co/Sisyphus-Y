"""SceneMapService regression tests."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.scene_map.service import SceneMapService


class TestStreamingAdapterUsage:
    async def test_generate_stream_uses_guarded_fallback_stream(self):
        session = AsyncMock()
        requirement = MagicMock()
        requirement.content_ast = {"raw_text": "需求内容", "metadata": {"owner": "qa"}}
        requirement.title = "数据源管理"
        session.get = AsyncMock(return_value=requirement)

        service = SceneMapService(session)
        guarded_stream = AsyncMock(return_value=iter(()))

        with patch(
            "app.modules.scene_map.service.get_thinking_stream_with_fallback",
            new=guarded_stream,
            create=True,
        ):
            await service.generate_stream(uuid.uuid4())

        guarded_stream.assert_awaited_once()
        call = guarded_stream.await_args
        assert call.kwargs["provider"] == "zhipu"
        assert call.kwargs["model"] == "glm-4-flash"
        assert "需求内容" in call.args[0][0]["content"]
        assert "metadata" not in call.args[0][0]["content"]
