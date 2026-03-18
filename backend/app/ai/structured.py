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


def _build_llm() -> Any:
    """构建 LangChain ChatOpenAI 实例（GLM OpenAI 兼容接口，禁用系统代理）。"""
    import httpx

    return ChatOpenAI(
        model=settings.zhipu_model,
        api_key=settings.zhipu_api_key,
        base_url="https://open.bigmodel.cn/api/paas/v4/",
        temperature=0.3,
        http_client=httpx.Client(proxy=None, trust_env=False),
        http_async_client=httpx.AsyncClient(proxy=None, trust_env=False),
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

    GLM 经常在 JSON 外包裹 markdown 代码围栏，此处通过 parse_test_cases 提取，
    再用 Pydantic 逐条校验，替代 with_structured_output 以保证健壮性。

    Args:
        messages: OpenAI 格式消息列表（含 system + user 等）。
        fallback_text: 降级时传入的原始 LLM 输出文本，用于正则解析。

    Returns:
        标准化用例字典列表，与 _standardize_cases 输出格式兼容。
    """
    try:
        llm = _build_llm()
        response = await llm.ainvoke(messages)
        raw_text = response.content if hasattr(response, "content") else str(response)
        raw_cases = parse_test_cases(raw_text)
        cases = _validate_cases(raw_cases)
        logger.info("结构化输出成功: %d 条用例（原始 %d 条）", len(cases), len(raw_cases))
        return cases
    except Exception as e:
        logger.warning("结构化输出失败，降级到正则解析: %s", e)
        if fallback_text:
            return parse_test_cases(fallback_text)
        return []
