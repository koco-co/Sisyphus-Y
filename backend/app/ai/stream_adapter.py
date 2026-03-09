"""统一的流式输出适配器，支持 OpenAI / Anthropic。

SSE 事件格式：
  event: thinking\ndata: {"delta": "..."}\n\n
  event: content\ndata: {"delta": "..."}\n\n
  event: done\ndata: {"usage": {...}}\n\n
"""

import json
from collections.abc import AsyncIterator

from app.core.config import settings


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def openai_thinking_stream(
    messages: list[dict],
    system: str = "",
) -> AsyncIterator[str]:
    """OpenAI 流式输出。"""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    yield _sse("thinking", {"delta": "正在分析需求，梳理测试场景...\n"})

    all_messages = messages
    if system:
        all_messages = [{"role": "system", "content": system}, *messages]

    stream = await client.chat.completions.create(
        model=settings.openai_model,
        messages=all_messages,
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            yield _sse("content", {"delta": delta})

    yield _sse("done", {"usage": {}})


async def anthropic_thinking_stream(
    messages: list[dict],
    system: str = "",
) -> AsyncIterator[str]:
    """Claude 扩展思考流式输出。"""
    import anthropic

    client = anthropic.AsyncAnthropic()

    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=16000,
        thinking={"type": "enabled", "budget_tokens": 10000},
        system=system,
        messages=messages,
    ) as stream:
        async for event in stream:
            if event.type == "content_block_delta":
                if event.delta.type == "thinking_delta":
                    yield _sse("thinking", {"delta": event.delta.thinking})
                elif event.delta.type == "text_delta":
                    yield _sse("content", {"delta": event.delta.text})

    yield _sse("done", {"usage": {}})


async def get_thinking_stream(
    messages: list[dict],
    system: str = "",
) -> AsyncIterator[str]:
    """根据 settings.llm_provider 选择适配器。"""
    provider = settings.llm_provider.lower()
    if provider == "anthropic":
        return anthropic_thinking_stream(messages, system)
    return openai_thinking_stream(messages, system)
