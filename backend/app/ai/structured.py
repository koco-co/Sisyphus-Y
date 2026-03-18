"""结构化输出封装 — 基于 LangChain + Pydantic，带降级到正则解析。

仅用于非流式生成路径（chat_driven_generate / template_driven_generate）。
流式 SSE 路径继续使用 stream_adapter.py，不受此模块影响。
"""

import logging
from typing import Any

from langchain_openai import ChatOpenAI
from langsmith import traceable
from pydantic import BaseModel, Field

from app.ai.parser import parse_test_cases
from app.core.config import settings

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════
# Pydantic 模型定义
# ═══════════════════════════════════════════════════════════════════


class TestStep(BaseModel):
    step_num: int
    action: str
    expected_result: str


class TestCase(BaseModel):
    title: str
    priority: str = Field(pattern="^P[0-2]$")
    case_type: str = Field(pattern="^(normal|exception|boundary|concurrent|permission)$")
    precondition: str
    steps: list[TestStep]
    keywords: list[str] = Field(default_factory=list)


class TestCaseList(BaseModel):
    cases: list[TestCase]


# ═══════════════════════════════════════════════════════════════════
# 结构化调用（带降级）
# ═══════════════════════════════════════════════════════════════════


def _build_llm(*, provider: str | None = None) -> Any:
    """构建 LangChain ChatOpenAI 实例，根据 provider 动态选择端点。"""
    import httpx

    selected = (provider or settings.llm_provider).lower()
    no_proxy = httpx.Client(proxy=None, trust_env=False)
    no_proxy_async = httpx.AsyncClient(proxy=None, trust_env=False)

    if selected == "openrouter":
        return ChatOpenAI(
            model=settings.openrouter_model,
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            temperature=0.3,
            http_client=no_proxy,
            http_async_client=no_proxy_async,
        )
    if selected == "dashscope":
        return ChatOpenAI(
            model=settings.dashscope_model,
            api_key=settings.dashscope_api_key,
            base_url=settings.dashscope_base_url,
            temperature=0.3,
            http_client=no_proxy,
            http_async_client=no_proxy_async,
        )
    # zhipu (default) or openai
    if selected == "openai":
        return ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=0.3,
            http_client=no_proxy,
            http_async_client=no_proxy_async,
        )
    # zhipu — GLM OpenAI 兼容接口
    return ChatOpenAI(
        model=settings.zhipu_model,
        api_key=settings.zhipu_api_key,
        base_url="https://open.bigmodel.cn/api/paas/v4/",
        temperature=0.3,
        http_client=no_proxy,
        http_async_client=no_proxy_async,
    )


def _validate_cases(raw: list[dict]) -> list[dict]:
    """对 JSON 解析结果逐条 Pydantic 校验，过滤不合法用例。"""
    valid: list[dict] = []
    for item in raw:
        try:
            case = TestCase.model_validate(item)
            valid.append(case.model_dump())
        except Exception:
            logger.debug("用例 Pydantic 校验失败，跳过: %s", item.get("title", "?"))
    return valid


@traceable(name="structured_case_gen", tags=["structured-output"])
async def generate_cases_structured(
    messages: list[dict],
    *,
    fallback_text: str | None = None,
) -> list[dict]:
    """结构化生成用例：调用 LLM → 提取 JSON → Pydantic 校验，失败时降级正则解析。

    支持 provider 自动降级：主模型失败后尝试 fallback provider。
    """
    primary = settings.llm_provider.lower()
    fallback_provider = getattr(settings, "llm_fallback_provider", "zhipu").lower()
    providers_to_try = [primary]
    if fallback_provider and fallback_provider != primary:
        providers_to_try.append(fallback_provider)

    for provider_name in providers_to_try:
        try:
            llm = _build_llm(provider=provider_name)
            response = await llm.ainvoke(messages)
            raw_text = response.content if hasattr(response, "content") else str(response)
            raw_cases = parse_test_cases(raw_text)
            cases = _validate_cases(raw_cases)
            logger.info("结构化输出成功 (provider=%s): %d 条用例（原始 %d 条）", provider_name, len(cases), len(raw_cases))
            return cases
        except Exception as e:
            logger.warning("结构化输出 provider=%s 失败: %s", provider_name, e)

    logger.warning("所有 provider 结构化输出失败，降级到正则解析")
    if fallback_text:
        return parse_test_cases(fallback_text)
    return []
