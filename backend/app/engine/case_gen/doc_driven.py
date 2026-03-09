"""文档驱动用例生成引擎 (B-M05-03)。

直接从需求文档内容生成测试用例，不依赖已确认的测试点。
适用场景：快速生成预览、测试点尚未确认时的初版用例。

流程：
  1. 构建 task instruction（需求标题 + 正文 + 可选范围约束）
  2. assemble_prompt 组装 7 层 Prompt
  3. LLM 流式生成
  4. parse_test_cases 解析 → 标准化字典列表
"""

import json
import logging
from collections.abc import AsyncIterator

from app.ai.parser import parse_test_cases
from app.ai.prompts import assemble_prompt
from app.ai.stream_adapter import get_thinking_stream_with_fallback

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# Task Instruction 模板
# ═══════════════════════════════════════════════════════════════════

_TASK_TEMPLATE = """\
请根据以下需求文档直接生成测试用例：

## 需求标题
{title}

## 需求内容
{content}

## 生成要求
1. 覆盖正常流程、异常场景、边界值、并发场景、权限安全
2. 每条用例必须可执行、可验证
3. 用例步骤原子化，一步只做一个操作
4. 前置条件必须详细描述可操作的系统状态
5. 预期结果必须具体可测量，禁止模糊断言

请输出严格的 JSON 数组，每个元素包含：
title（用例标题）、priority（P0/P1/P2）、case_type（normal/exception/boundary/concurrent/permission）、\
precondition（前置条件）、steps（步骤数组，每步含 step_num / action / expected_result）。"""

_SCOPE_SECTION = """

## 测试范围限定
{scope}"""


def build_task_instruction(
    requirement_title: str,
    requirement_content: str,
    scope: str | None = None,
) -> str:
    """组装 task instruction，可选范围约束。"""
    task = _TASK_TEMPLATE.format(title=requirement_title, content=requirement_content)
    if scope:
        task += _SCOPE_SECTION.format(scope=scope)
    return task


# ═══════════════════════════════════════════════════════════════════
# 流式生成
# ═══════════════════════════════════════════════════════════════════


async def doc_driven_stream(
    requirement_title: str,
    requirement_content: str,
    *,
    scope: str | None = None,
    rag_context: str | None = None,
) -> AsyncIterator[str]:
    """流式生成用例，返回 SSE 异步迭代器。"""
    task_instruction = build_task_instruction(requirement_title, requirement_content, scope)
    system = assemble_prompt("generation", task_instruction, rag_context=rag_context)
    messages = [
        {
            "role": "user",
            "content": (
                f"请为以下需求直接生成测试用例：\n\n需求标题：{requirement_title}\n\n需求内容：\n{requirement_content}"
            ),
        }
    ]
    return await get_thinking_stream_with_fallback(messages, system=system)


# ═══════════════════════════════════════════════════════════════════
# SSE 文本提取
# ═══════════════════════════════════════════════════════════════════


def _extract_content_from_sse(sse_text: str) -> str:
    """从 SSE 格式文本中提取所有 content delta 拼接结果。"""
    parts: list[str] = []
    current_event = ""
    for line in sse_text.split("\n"):
        if line.startswith("event:"):
            current_event = line[len("event:") :].strip()
        elif line.startswith("data:") and current_event == "content":
            try:
                data = json.loads(line[len("data:") :].strip())
                parts.append(data.get("delta", ""))
            except (json.JSONDecodeError, AttributeError):
                pass
    return "".join(parts)


# ═══════════════════════════════════════════════════════════════════
# 非流式生成（收集 → 解析 → 标准化）
# ═══════════════════════════════════════════════════════════════════


async def doc_driven_generate(
    requirement_title: str,
    requirement_content: str,
    *,
    scope: str | None = None,
    rag_context: str | None = None,
) -> list[dict]:
    """非流式生成：收集完整 SSE 输出 → 解析 → 标准化用例列表。

    Returns:
        每个 dict 包含 title / precondition / priority / case_type / steps / source，
        与 TestCase 模型兼容。
    """
    stream = await doc_driven_stream(
        requirement_title,
        requirement_content,
        scope=scope,
        rag_context=rag_context,
    )

    chunks: list[str] = []
    async for chunk in stream:
        chunks.append(chunk)

    full_sse = "".join(chunks)
    full_text = _extract_content_from_sse(full_sse)

    cases = parse_test_cases(full_text)
    standardized = _standardize_cases(cases)
    logger.info("文档驱动生成 %d 条用例 (title=%s)", len(standardized), requirement_title)
    return standardized


def _standardize_cases(raw_cases: list[dict]) -> list[dict]:
    """将 parse_test_cases 输出标准化为 TestCase 模型兼容字段。"""
    results: list[dict] = []
    for c in raw_cases:
        results.append(
            {
                "title": c.get("title", "未命名用例"),
                "precondition": c.get("precondition", ""),
                "priority": c.get("priority", "P1"),
                "case_type": c.get("case_type", "normal"),
                "steps": c.get("steps", []),
                "source": "ai",
            }
        )
    return results
