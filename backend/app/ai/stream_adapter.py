"""统一的流式输出适配器，支持 OpenAI / Anthropic / ZhiPu。

SSE 事件格式：
  event: thinking\ndata: {"delta": "..."}\n\n
  event: content\ndata: {"delta": "..."}\n\n
  event: done\ndata: {"usage": {...}}\n\n

性能优化：
  - 心跳机制：每 15s 发送 :keepalive 注释行
  - 超时保护：5 分钟无输出自动关闭
"""

import asyncio
import importlib
import json
import logging
import time
from collections.abc import AsyncIterator
from typing import Any, cast

from langsmith import traceable

from app.ai.llm_client import invoke_llm
from app.core.config import settings

logger = logging.getLogger(__name__)

# 心跳间隔 (秒) 和超时时间 (秒)
_HEARTBEAT_INTERVAL = 15
_STALL_FALLBACK_TIMEOUT = 8
_STREAM_TIMEOUT = 300  # 5 分钟


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _keepalive() -> str:
    return ": keepalive\n\n"


class StreamStalledError(RuntimeError):
    """Raised when a streaming provider never emits real content."""


def _is_substantive_chunk(chunk: str) -> bool:
    return chunk.startswith("event: content") or chunk.startswith("event: done") or chunk.startswith("event: error")


def _messages_with_system(messages: list[dict], system: str) -> list[dict]:
    if not system:
        return messages
    return [{"role": "system", "content": system}, *messages]


def _chunk_text(content: str, chunk_size: int = 160) -> list[str]:
    if not content:
        return [""]
    return [content[i : i + chunk_size] for i in range(0, len(content), chunk_size)]


async def _emit_non_stream_fallback(
    messages: list[dict],
    system: str,
    provider_name: str,
    model: str | None = None,
) -> AsyncIterator[str]:
    result = await invoke_llm(
        _messages_with_system(messages, system),
        provider=provider_name,
        model=model,
        max_retries=0,
    )
    for delta in _chunk_text(result.content):
        yield _sse("content", {"delta": delta})
    yield _sse("done", {"usage": result.usage})


async def openai_thinking_stream(
    messages: list[dict],
    system: str = "",
    model: str | None = None,
) -> AsyncIterator[str]:
    """OpenAI 流式输出。"""
    import httpx
    from openai import AsyncOpenAI

    no_proxy_client = httpx.AsyncClient(proxy=None, trust_env=False)
    client = AsyncOpenAI(api_key=settings.openai_api_key, http_client=no_proxy_client)

    yield _sse("thinking", {"delta": "正在分析需求，梳理测试场景...\n"})

    all_messages = messages
    if system:
        all_messages = [{"role": "system", "content": system}, *messages]

    stream = cast(
        Any,
        await client.chat.completions.create(
            model=model or settings.openai_model,
            messages=cast(Any, all_messages),
            stream=True,
        ),
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            yield _sse("content", {"delta": delta})

    yield _sse("done", {"usage": {}})


async def anthropic_thinking_stream(
    messages: list[dict],
    system: str = "",
    model: str | None = None,
) -> AsyncIterator[str]:
    """Claude 扩展思考流式输出。"""
    anthropic = importlib.import_module("anthropic")

    client = anthropic.AsyncAnthropic()

    async with client.messages.stream(
        model=model or "claude-sonnet-4-6",
        max_tokens=16000,
        thinking={"type": "enabled", "budget_tokens": 10000},
        system=system,
        messages=cast(Any, messages),
    ) as stream:
        async for event in stream:
            if event.type == "content_block_delta":
                if event.delta.type == "thinking_delta":
                    yield _sse("thinking", {"delta": event.delta.thinking})
                elif event.delta.type == "text_delta":
                    yield _sse("content", {"delta": event.delta.text})

    yield _sse("done", {"usage": {}})


async def zhipu_thinking_stream(
    messages: list[dict],
    system: str = "",
    model: str | None = None,
) -> AsyncIterator[str]:
    """智谱 GLM 流式输出，运行在线程池以避免阻塞事件循环。"""
    import httpx
    from zhipuai import ZhipuAI

    # 绕过系统 SOCKS 代理，ZhiPu 是国内服务无需代理
    no_proxy_client = httpx.Client(proxy=None, trust_env=False)
    client = ZhipuAI(api_key=settings.zhipu_api_key, http_client=no_proxy_client)

    yield _sse("thinking", {"delta": "正在分析需求，梳理测试场景...\n"})

    all_messages = messages
    if system:
        all_messages = [{"role": "system", "content": system}, *messages]

    # ZhiPu SDK 是同步的，放到线程池中执行
    def _create_stream():
        return client.chat.completions.create(
            model=model or settings.zhipu_model,
            messages=cast(Any, all_messages),
            stream=True,
        )

    stream = await asyncio.to_thread(_create_stream)

    # 逐 chunk 消费也需要包在 to_thread 里
    def _next_chunk(iterator):
        try:
            return next(iterator)
        except StopIteration:
            return None

    while True:
        chunk = await asyncio.to_thread(_next_chunk, stream)
        if chunk is None:
            break
        choice = chunk.choices[0] if chunk.choices else None
        if choice and choice.delta and choice.delta.content:
            yield _sse("content", {"delta": choice.delta.content})

    yield _sse("done", {"usage": {}})


async def dashscope_thinking_stream(
    messages: list[dict],
    system: str = "",
    model: str | None = None,
) -> AsyncIterator[str]:
    """阿里百炼 Dashscope 流式输出 (OpenAI 兼容模式)。"""
    import httpx
    from openai import AsyncOpenAI

    # 绕过系统 SOCKS 代理，Dashscope 是国内服务无需代理
    no_proxy_client = httpx.AsyncClient(proxy=None, trust_env=False)
    client = AsyncOpenAI(
        api_key=settings.dashscope_api_key,
        base_url=settings.dashscope_base_url,
        http_client=no_proxy_client,
    )

    yield _sse("thinking", {"delta": "正在分析需求，梳理测试场景...\n"})

    all_messages = messages
    if system:
        all_messages = [{"role": "system", "content": system}, *messages]

    stream = cast(
        Any,
        await client.chat.completions.create(
            model=model or settings.dashscope_model,
            messages=cast(Any, all_messages),
            stream=True,
        ),
    )

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield _sse("content", {"delta": chunk.choices[0].delta.content})

    yield _sse("done", {"usage": {}})


async def get_thinking_stream(
    messages: list[dict],
    system: str = "",
    provider: str | None = None,
    model: str | None = None,
) -> AsyncIterator[str]:
    """根据 settings.llm_provider 选择适配器。"""
    selected_provider = (provider or settings.llm_provider).lower()
    if selected_provider == "anthropic":
        return anthropic_thinking_stream(messages, system, model)
    if selected_provider == "zhipu":
        return zhipu_thinking_stream(messages, system, model)
    if selected_provider == "dashscope":
        return dashscope_thinking_stream(messages, system, model)
    return openai_thinking_stream(messages, system, model)


_PROVIDER_FUNCS = {
    "openai": openai_thinking_stream,
    "anthropic": anthropic_thinking_stream,
    "zhipu": zhipu_thinking_stream,
    "dashscope": dashscope_thinking_stream,
}


async def _with_heartbeat_and_timeout(
    source: AsyncIterator[str],
) -> AsyncIterator[str]:
    """为任意 SSE 流添加心跳 (15s) 和超时保护 (5min)。"""
    last_activity = time.monotonic()
    stream_started = last_activity
    has_substantive_output = False

    async def _next_chunk():
        return await source.__anext__()

    while True:
        now = time.monotonic()
        remaining = _STREAM_TIMEOUT - (now - last_activity)
        if remaining <= 0:
            logger.warning("SSE 流超时 (%ds 无输出)，自动关闭", _STREAM_TIMEOUT)
            yield _sse("content", {"delta": "\n\n⚠️ 流式输出超时，已自动关闭。"})
            yield _sse("done", {"usage": {}})
            return

        stall_remaining: float | None = None
        if not has_substantive_output:
            stall_remaining = _STALL_FALLBACK_TIMEOUT - (now - stream_started)
            if stall_remaining <= 0:
                raise StreamStalledError("流式提供商长时间未返回有效内容")

        try:
            timeout = min(_HEARTBEAT_INTERVAL, remaining, stall_remaining or _HEARTBEAT_INTERVAL)
            chunk = await asyncio.wait_for(
                _next_chunk(),
                timeout=timeout,
            )
            last_activity = time.monotonic()
            if _is_substantive_chunk(chunk):
                has_substantive_output = True
            yield chunk
        except TimeoutError:
            if not has_substantive_output and (time.monotonic() - stream_started) >= _STALL_FALLBACK_TIMEOUT:
                raise StreamStalledError("流式提供商长时间未返回有效内容") from None
            yield _keepalive()
        except StopAsyncIteration:
            return


@traceable(name="llm_stream", tags=["stream"])
async def get_thinking_stream_with_fallback(
    messages: list[dict],
    system: str = "",
    provider: str | None = None,
    model: str | None = None,
    max_retries: int = 2,
) -> AsyncIterator[str]:
    """带重试、降级、心跳和超时保护的流式输出。

    1. 尝试主模型 (settings.llm_provider)
    2. 重试 max_retries 次（指数退避 1s, 2s）
    3. 降级到备用模型 (settings.llm_fallback_provider)
    4. 每 15s 发送 :keepalive，5min 无输出自动关闭
    """
    primary = (provider or settings.llm_provider).lower()
    fallback = getattr(settings, "llm_fallback_provider", "zhipu").lower()

    providers_to_try = [primary]
    if fallback and fallback != primary:
        providers_to_try.append(fallback)

    async def _stream_with_fallback() -> AsyncIterator[str]:
        last_error: Exception | None = None
        for provider_name in providers_to_try:
            func = _PROVIDER_FUNCS.get(provider_name)
            if not func:
                continue
            for attempt in range(max_retries + 1):
                provider_model = model if provider_name == primary else None
                try:
                    raw_stream = func(messages, system, provider_model)
                    guarded = _with_heartbeat_and_timeout(raw_stream)
                    has_substantive_output = False
                    async for chunk in guarded:
                        if _is_substantive_chunk(chunk):
                            has_substantive_output = True
                        yield chunk
                    if has_substantive_output:
                        return
                    async for chunk in _emit_non_stream_fallback(messages, system, provider_name, provider_model):
                        yield chunk
                    return
                except StreamStalledError as e:
                    last_error = e
                    logger.warning(
                        "LLM %s attempt %d stalled before content, falling back to non-stream: %s",
                        provider_name,
                        attempt + 1,
                        e,
                    )
                    try:
                        async for chunk in _emit_non_stream_fallback(messages, system, provider_name, provider_model):
                            yield chunk
                        return
                    except Exception as fallback_error:
                        last_error = fallback_error
                        logger.warning(
                            "LLM %s non-stream fallback attempt %d failed: %s",
                            provider_name,
                            attempt + 1,
                            fallback_error,
                        )
                        if attempt < max_retries:
                            await asyncio.sleep(2**attempt)
                except Exception as e:
                    last_error = e
                    logger.warning(
                        "LLM %s attempt %d failed: %s",
                        provider_name,
                        attempt + 1,
                        e,
                    )
                    if attempt < max_retries:
                        await asyncio.sleep(2**attempt)

        # All providers failed
        logger.error("All LLM stream attempts failed: %s", last_error)
        yield _sse("content", {"delta": "⚠️ AI 服务暂时不可用，请稍后重试。"})
        yield _sse("done", {"usage": {}})

    return _stream_with_fallback()
