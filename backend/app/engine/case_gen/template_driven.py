"""模板填充用例生成引擎 (B-M05-05)。

基于已有用例模板生成测试用例，将模板中的占位符替换为实际内容。
支持单模板生成和批量生成。

流程：
  1. 加载模板定义（template_content + variables）
  2. 构建 task instruction（模板结构 + 需求上下文 + 变量绑定）
  3. assemble_prompt 组装 7 层 Prompt
  4. LLM 生成 → parse_test_cases → 标准化
"""

import json
import logging
import re
from collections.abc import AsyncIterator

from langsmith import traceable

from app.ai.parser import parse_test_cases
from app.ai.prompts import assemble_prompt
from app.ai.stream_adapter import get_thinking_stream_with_fallback

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# Task Instruction 模板
# ═══════════════════════════════════════════════════════════════════

_TASK_TEMPLATE = """\
请基于以下用例模板和需求上下文生成测试用例：

## 模板信息
模板名称：{template_name}
模板分类：{template_category}
模板描述：{template_description}

## 模板结构
```json
{template_content}
```

## 变量绑定
{variable_bindings}

## 需求上下文
需求标题：{requirement_title}
需求内容：{requirement_content}

## 生成要求
1. 严格按照模板结构生成用例，保持模板定义的步骤框架
2. 将模板中的占位符（如 {{module_name}}、{{field_name}}）替换为实际内容
3. 根据需求上下文补充模板未覆盖的具体细节
4. 前置条件和预期结果必须结合实际需求描述
5. 生成的用例必须可执行、可验证

请输出严格的 JSON 数组，每个元素包含：
title（用例标题）、priority（P0/P1/P2）、case_type（normal/exception/boundary/concurrent/permission）、\
precondition（前置条件）、steps（步骤数组，每步含 step_num / action / expected_result）。"""


def _format_variable_bindings(
    template_variables: dict | None,
    user_variables: dict[str, str] | None,
) -> str:
    """格式化变量绑定信息，展示模板预定义变量及用户提供的绑定值。"""
    if not template_variables and not user_variables:
        return "（无变量绑定）"

    lines: list[str] = []
    declared = template_variables or {}
    provided = user_variables or {}

    for var_name, var_meta in declared.items():
        description = var_meta if isinstance(var_meta, str) else var_meta.get("description", "")
        bound_value = provided.get(var_name, "")
        if bound_value:
            lines.append(f"- `{{{{{var_name}}}}}` → {bound_value}（{description}）")
        else:
            lines.append(f"- `{{{{{var_name}}}}}` — {description}（未绑定，请根据需求推断）")

    # 用户提供了模板未声明的额外变量
    for var_name, var_value in provided.items():
        if var_name not in declared:
            lines.append(f"- `{{{{{var_name}}}}}` → {var_value}（自定义变量）")

    return "\n".join(lines) if lines else "（无变量绑定）"


def build_task_instruction(
    template_name: str,
    template_category: str,
    template_description: str,
    template_content: dict,
    template_variables: dict | None,
    user_variables: dict[str, str] | None,
    requirement_title: str,
    requirement_content: str,
) -> str:
    """组装模板填充的 task instruction。"""
    return _TASK_TEMPLATE.format(
        template_name=template_name,
        template_category=template_category,
        template_description=template_description or "无",
        template_content=json.dumps(template_content, ensure_ascii=False, indent=2),
        variable_bindings=_format_variable_bindings(template_variables, user_variables),
        requirement_title=requirement_title,
        requirement_content=requirement_content,
    )


# ═══════════════════════════════════════════════════════════════════
# 简单占位符替换（不走 LLM，快速预填充）
# ═══════════════════════════════════════════════════════════════════

_PLACEHOLDER_RE = re.compile(r"\{\{(\w+)\}\}")


def prefill_template(template_content: dict, variables: dict[str, str]) -> dict:
    """对模板内容做简单占位符替换，返回预填充后的副本。

    占位符格式为 ``{{variable_name}}``。仅处理字符串类型的值。
    """

    def _replace(text: str) -> str:
        return _PLACEHOLDER_RE.sub(lambda m: variables.get(m.group(1), m.group(0)), text)

    def _walk(obj: object) -> object:
        if isinstance(obj, str):
            return _replace(obj)
        if isinstance(obj, dict):
            return {k: _walk(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_walk(item) for item in obj]
        return obj

    return _walk(template_content)  # type: ignore[return-value]


# ═══════════════════════════════════════════════════════════════════
# 流式生成
# ═══════════════════════════════════════════════════════════════════


async def template_driven_stream(
    template_name: str,
    template_category: str,
    template_description: str,
    template_content: dict,
    template_variables: dict | None,
    user_variables: dict[str, str] | None,
    requirement_title: str,
    requirement_content: str,
    *,
    rag_context: str | None = None,
) -> AsyncIterator[str]:
    """模板驱动流式生成用例，返回 SSE 异步迭代器。"""
    task_instruction = build_task_instruction(
        template_name,
        template_category,
        template_description,
        template_content,
        template_variables,
        user_variables,
        requirement_title,
        requirement_content,
    )
    system = assemble_prompt("generation", task_instruction, rag_context=rag_context)
    messages = [
        {
            "role": "user",
            "content": (
                f"请基于模板「{template_name}」为以下需求生成测试用例：\n\n"
                f"需求标题：{requirement_title}\n\n"
                f"需求内容：\n{requirement_content}"
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
# 非流式生成（单模板）
# ═══════════════════════════════════════════════════════════════════


@traceable(name="case_gen/template_driven", metadata={"module": "case_gen"})
async def template_driven_generate(
    template_name: str,
    template_category: str,
    template_description: str,
    template_content: dict,
    template_variables: dict | None,
    user_variables: dict[str, str] | None,
    requirement_title: str,
    requirement_content: str,
    *,
    rag_context: str | None = None,
) -> list[dict]:
    """非流式模板生成：收集完整输出 → 解析 → 标准化用例列表。

    Returns:
        每个 dict 包含 title / precondition / priority / case_type / steps / source，
        与 TestCase 模型兼容。
    """
    stream = await template_driven_stream(
        template_name,
        template_category,
        template_description,
        template_content,
        template_variables,
        user_variables,
        requirement_title,
        requirement_content,
        rag_context=rag_context,
    )

    chunks: list[str] = []
    async for chunk in stream:
        chunks.append(chunk)

    full_sse = "".join(chunks)
    full_text = _extract_content_from_sse(full_sse)

    cases = parse_test_cases(full_text)
    standardized = _standardize_cases(cases)
    logger.info(
        "模板驱动生成 %d 条用例 (template=%s, title=%s)",
        len(standardized),
        template_name,
        requirement_title,
    )
    return standardized


# ═══════════════════════════════════════════════════════════════════
# 批量生成（多模板）
# ═══════════════════════════════════════════════════════════════════


async def template_driven_generate_batch(
    templates: list[dict],
    requirement_title: str,
    requirement_content: str,
    *,
    user_variables: dict[str, str] | None = None,
    rag_context: str | None = None,
) -> list[dict]:
    """批量模板生成：对多个模板逐一生成并汇总。

    Args:
        templates: 模板列表，每个 dict 包含：
            name, category, description, template_content, variables
        requirement_title: 需求标题
        requirement_content: 需求内容
        user_variables: 公共变量绑定（应用于所有模板）
        rag_context: RAG 知识库上下文

    Returns:
        所有模板生成的用例汇总列表。
    """
    all_cases: list[dict] = []

    for tpl in templates:
        try:
            cases = await template_driven_generate(
                template_name=tpl.get("name", "未命名模板"),
                template_category=tpl.get("category", "general"),
                template_description=tpl.get("description", ""),
                template_content=tpl.get("template_content", {}),
                template_variables=tpl.get("variables"),
                user_variables=user_variables,
                requirement_title=requirement_title,
                requirement_content=requirement_content,
                rag_context=rag_context,
            )
            all_cases.extend(cases)
        except Exception:
            logger.exception("模板 %s 生成失败，跳过", tpl.get("name", ""))

    logger.info(
        "批量模板生成完成：%d 个模板，共 %d 条用例",
        len(templates),
        len(all_cases),
    )
    return all_cases


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
