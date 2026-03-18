"""对话引导用例生成引擎 (B-M05-04)。

通过多轮对话引导用户明确测试范围并逐步生成用例。
维护对话上下文（历史消息列表），支持追问、修改、补充。

流程：
  1. 接收对话历史 + 当前用户消息
  2. 构建 task instruction（含需求上下文 + 对话阶段指引）
  3. assemble_prompt 组装 7 层 Prompt（使用 exploratory 模块）
  4. LLM 流式生成
  5. parse_test_cases 从回复中提取结构化用例（如果包含）
"""

import json
import logging
from collections.abc import AsyncIterator

from langsmith import traceable

from app.ai.parser import parse_test_cases
from app.ai.prompts import assemble_prompt
from app.ai.stream_adapter import get_thinking_stream_with_fallback
from app.engine.rag.retriever import retrieve_as_context

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# Task Instruction 模板
# ═══════════════════════════════════════════════════════════════════

_TASK_TEMPLATE = """\
你正在与用户进行多轮对话，协作完成测试用例设计。

## 需求上下文
{context}

## 对话引导策略
1. **理解意图**：先确认用户想要测试的功能模块和范围
2. **主动追问**：如果用户描述不够具体，主动追问关键细节（边界值、异常场景、并发需求）
3. **逐步生成**：每次生成不超过 5 条用例，待用户确认后再补充
4. **灵活调整**：支持用户追加、修改、删除已生成的用例
5. **引导补充**：主动询问是否需要补充边界值/异常/并发/权限场景

## 输出规范
- 用自然语言与用户对话，保持友好专业的语气
- 生成用例时，在回复中嵌入 JSON 数组格式的用例
- 每条用例包含：title、priority（P0/P1/P2）、case_type（normal/exception/boundary/concurrent/permission）、\
precondition、steps（含 step_num / action / expected_result）
- 如果用户要求修改已有用例，输出修改后的完整用例"""

_CONTEXT_TEMPLATE = """\
需求标题：{title}
需求内容：{content}"""

_EXISTING_CASES_SECTION = """

## 已生成用例（供参考和修改）
{cases_summary}"""


def build_task_instruction(
    requirement_title: str,
    requirement_content: str,
    existing_cases: list[dict] | None = None,
) -> str:
    """组装 task instruction，包含需求上下文和已有用例摘要。"""
    context = _CONTEXT_TEMPLATE.format(title=requirement_title, content=requirement_content)
    task = _TASK_TEMPLATE.format(context=context)

    if existing_cases:
        lines = [f"- [{c.get('priority', 'P1')}] {c.get('title', '')}" for c in existing_cases]
        task += _EXISTING_CASES_SECTION.format(cases_summary="\n".join(lines))

    return task


def build_messages(
    history: list[dict[str, str]],
    current_message: str,
) -> list[dict[str, str]]:
    """构建发送给 LLM 的消息列表（含历史 + 当前消息）。"""
    messages = list(history)
    messages.append({"role": "user", "content": current_message})
    return messages


# ═══════════════════════════════════════════════════════════════════
# 流式生成
# ═══════════════════════════════════════════════════════════════════


async def chat_driven_stream(
    requirement_title: str,
    requirement_content: str,
    history: list[dict[str, str]],
    current_message: str,
    *,
    existing_cases: list[dict] | None = None,
    rag_context: str | None = None,
) -> AsyncIterator[str]:
    """对话式流式生成，返回 SSE 异步迭代器。

    Args:
        requirement_title: 需求标题
        requirement_content: 需求内容
        history: 对话历史 [{"role": "user"/"assistant", "content": "..."}]
        current_message: 当前用户消息
        existing_cases: 已生成的用例列表（用于上下文参考）
        rag_context: RAG 知识库上下文
    """
    task_instruction = build_task_instruction(
        requirement_title,
        requirement_content,
        existing_cases,
    )
    system = assemble_prompt("exploratory", task_instruction, rag_context=rag_context)
    messages = build_messages(history, current_message)
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
# 非流式生成（收集 → 解析）
# ═══════════════════════════════════════════════════════════════════


@traceable(name="case_gen/chat_driven", metadata={"module": "case_gen"})
async def chat_driven_generate(
    requirement_title: str,
    requirement_content: str,
    history: list[dict[str, str]],
    current_message: str,
    *,
    existing_cases: list[dict] | None = None,
    rag_context: str | None = None,
) -> tuple[str, list[dict]]:
    """非流式对话生成：收集完整输出 → 解析用例。

    Returns:
        (full_text, parsed_cases) 元组：
        - full_text: AI 完整回复文本（含自然语言 + 嵌入的用例 JSON）
        - parsed_cases: 从回复中提取的标准化用例列表（可能为空，
          当 AI 仅进行对话追问而未生成用例时）
    """
    if rag_context is None:
        try:
            rag_context = await retrieve_as_context(requirement_content, top_k=5, score_threshold=0.72)
        except Exception:
            logger.warning("RAG 检索失败，跳过知识库注入")
            rag_context = None

    stream = await chat_driven_stream(
        requirement_title,
        requirement_content,
        history,
        current_message,
        existing_cases=existing_cases,
        rag_context=rag_context,
    )

    chunks: list[str] = []
    async for chunk in stream:
        chunks.append(chunk)

    full_sse = "".join(chunks)
    full_text = _extract_content_from_sse(full_sse)

    cases = parse_test_cases(full_text)
    standardized = _standardize_cases(cases)

    if standardized:
        logger.info(
            "对话引导生成 %d 条用例 (title=%s)",
            len(standardized),
            requirement_title,
        )
    else:
        logger.debug("对话回合未产生用例，可能是追问/确认阶段")

    return full_text, standardized


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
