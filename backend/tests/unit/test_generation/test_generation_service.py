"""B-M05-17 — 用例生成服务测试。"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy.dialects import postgresql


def _compile_sql(statement) -> str:
    return str(
        statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )


class TestGetOrCreateSession:
    async def test_get_or_create_session_filters_by_mode(self):
        """复用会话查询应限制在相同生成模式内。"""
        from app.modules.generation.service import GenerationService

        requirement_id = uuid.uuid4()
        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        session.execute = AsyncMock(return_value=mock_result)

        service = GenerationService(session)

        with patch.object(service, "create_session", AsyncMock()) as create_session:
            await service.get_or_create_session(requirement_id, mode="dialogue")

        sql = _compile_sql(session.execute.await_args.args[0])
        assert "generation_sessions.mode = 'dialogue'" in sql
        create_session.assert_awaited_once_with(requirement_id, "dialogue")


class TestChatStreamContext:
    async def test_chat_stream_injects_only_confirmed_test_points(self):
        """首轮注入 LLM 上下文时，只能带入已确认测试点。"""
        from app.modules.generation.service import GenerationService

        session_id = uuid.uuid4()
        requirement_id = uuid.uuid4()
        scene_map_id = uuid.uuid4()

        gen_session = MagicMock()
        gen_session.requirement_id = requirement_id
        gen_session.mode = "test_point_driven"

        requirement = MagicMock()
        requirement.title = "任务草稿自动保存"
        requirement.content_ast = {"summary": "自动保存草稿"}

        scene_map = MagicMock()
        scene_map.id = scene_map_id

        confirmed_point = MagicMock()
        confirmed_point.group_name = "正常流程"
        confirmed_point.title = "自动保存成功"
        confirmed_point.priority = "P0"
        confirmed_point.status = "confirmed"

        draft_point = MagicMock()
        draft_point.group_name = "异常流程"
        draft_point.title = "保存失败仅草稿"
        draft_point.priority = "P1"
        draft_point.status = "ai_generated"

        session = AsyncMock()
        session.get = AsyncMock(return_value=requirement)

        map_result = MagicMock()
        map_result.scalar_one_or_none.return_value = scene_map

        scalars_result = MagicMock()
        scalars_result.all.return_value = [confirmed_point, draft_point]

        test_points_result = MagicMock()
        test_points_result.scalars.return_value = scalars_result

        session.execute = AsyncMock(side_effect=[map_result, test_points_result])

        service = GenerationService(session)

        first_turn_message = MagicMock()
        first_turn_message.role = "user"
        first_turn_message.content = "请生成测试用例"

        async def _fake_stream():
            if False:
                yield "noop"

        with (
            patch.object(service, "get_session", AsyncMock(return_value=gen_session)),
            patch.object(service, "list_messages", AsyncMock(return_value=[first_turn_message])),
            patch(
                "app.modules.generation.service.get_thinking_stream_with_fallback",
                AsyncMock(return_value=_fake_stream()),
            ) as stream_mock,
            patch("app.modules.generation.service.assemble_prompt", return_value="system prompt"),
            patch("app.engine.rag.retriever.retrieve_cases_as_context", AsyncMock(return_value="")),
        ):
            await service.chat_stream(session_id, "请生成测试用例")

        history = stream_mock.await_args.args[0]
        injected_content = history[0]["content"]

        assert "自动保存成功" in injected_content
        assert "保存失败仅草稿" not in injected_content
