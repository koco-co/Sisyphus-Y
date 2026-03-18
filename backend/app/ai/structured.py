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


def _build_structured_llm() -> Any:
    """构建带结构化输出的 LangChain LLM 实例（GLM-5 OpenAI 兼容接口）。"""
    return ChatOpenAI(
        model="glm-5",
        api_key=settings.zhipu_api_key,
        base_url="https://open.bigmodel.cn/api/paas/v4/",
        temperature=0.3,
    ).with_structured_output(TestCaseList)


@traceable(name="structured_case_gen", tags=["structured-output"])
async def generate_cases_structured(
    messages: list[dict],
    *,
    fallback_text: str | None = None,
) -> list[dict]:
    """结构化生成用例，Pydantic 强校验，失败时降级到正则解析。

    Args:
        messages: OpenAI 格式消息列表（含 system + user 等）。
        fallback_text: 降级时传入的原始 LLM 输出文本，用于正则解析。

    Returns:
        标准化用例字典列表，与 _standardize_cases 输出格式兼容。
    """
    try:
        llm = _build_structured_llm()
        result: TestCaseList = await llm.ainvoke(messages)
        cases = [c.model_dump() for c in result.cases]
        logger.info("结构化输出成功: %d 条用例", len(cases))
        return cases
    except Exception as e:
        logger.warning("结构化输出失败，降级到正则解析: %s", e)
        if fallback_text:
            return parse_test_cases(fallback_text)
        return []
