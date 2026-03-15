"""stream_adapter regressions."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

from app.ai.llm_client import LLMResult


class TestThinkingStreamFallback:
    async def test_falls_back_to_non_stream_when_stream_stalls_before_content(self):
        from app.ai import stream_adapter

        async def stalled_stream(messages, system="", model=None):
            yield stream_adapter._sse("thinking", {"delta": "正在思考"})
            await asyncio.sleep(3600)

        invoke_llm = AsyncMock(return_value=LLMResult(content="最终答案", usage={"completion_tokens": 3}))

        with (
            patch.dict(stream_adapter._PROVIDER_FUNCS, {"zhipu": stalled_stream}),
            patch.object(stream_adapter.settings, "llm_provider", "zhipu"),
            patch.object(stream_adapter.settings, "llm_fallback_provider", "zhipu"),
            patch.object(stream_adapter, "_HEARTBEAT_INTERVAL", 0.01),
            patch.object(stream_adapter, "_STALL_FALLBACK_TIMEOUT", 0.02, create=True),
            patch.object(stream_adapter, "_STREAM_TIMEOUT", 1),
            patch("app.ai.stream_adapter.invoke_llm", new=invoke_llm, create=True),
        ):
            stream = await stream_adapter.get_thinking_stream_with_fallback(
                [{"role": "user", "content": "请给出分析结论"}],
                system="系统提示",
                max_retries=0,
            )
            chunks = [chunk async for chunk in stream]

        assert any('event: thinking' in chunk for chunk in chunks)
        assert any('event: content' in chunk and "最终答案" in chunk for chunk in chunks)
        assert any('event: done' in chunk for chunk in chunks)

        invoke_llm.assert_awaited_once()
        called_messages = invoke_llm.await_args.args[0]
        assert called_messages[0] == {"role": "system", "content": "系统提示"}
        assert called_messages[1] == {"role": "user", "content": "请给出分析结论"}
        assert invoke_llm.await_args.kwargs["provider"] == "zhipu"
        assert invoke_llm.await_args.kwargs["max_retries"] == 0
