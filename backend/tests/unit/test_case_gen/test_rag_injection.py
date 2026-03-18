import pytest
from unittest.mock import AsyncMock, patch


async def _aiter(items):
    for i in items:
        yield i


@pytest.mark.asyncio
async def test_chat_driven_calls_rag():
    with (
        patch("app.engine.case_gen.chat_driven.retrieve_as_context", new_callable=AsyncMock) as mock_rag,
        patch("app.engine.case_gen.chat_driven.get_thinking_stream_with_fallback", new_callable=AsyncMock) as mock_stream,
        patch("app.engine.case_gen.chat_driven.generate_cases_structured", new_callable=AsyncMock, return_value=[]),
    ):
        mock_rag.return_value = "rag context"
        mock_stream.return_value = _aiter([])
        from app.engine.case_gen.chat_driven import chat_driven_generate
        await chat_driven_generate("title", "content", [], "msg")
        mock_rag.assert_called_once()


@pytest.mark.asyncio
async def test_template_driven_calls_rag():
    with (
        patch("app.engine.case_gen.template_driven.retrieve_as_context", new_callable=AsyncMock) as mock_rag,
        patch("app.engine.case_gen.template_driven.get_thinking_stream_with_fallback", new_callable=AsyncMock) as mock_stream,
        patch("app.engine.case_gen.template_driven.generate_cases_structured", new_callable=AsyncMock, return_value=[]),
    ):
        mock_rag.return_value = "rag context"
        mock_stream.return_value = _aiter([])
        from app.engine.case_gen.template_driven import template_driven_generate
        await template_driven_generate(
            template_name="test_tpl",
            template_category="general",
            template_description="desc",
            template_content={},
            template_variables=None,
            user_variables=None,
            requirement_title="title",
            requirement_content="content",
        )
        mock_rag.assert_called_once()
