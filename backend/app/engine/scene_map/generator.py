"""场景地图生成引擎 — 从需求文本生成测试点草稿。

职责：
  1. 构建测试点生成的 task instruction（含增量去重上下文）
  2. 调用 LLM 流式生成并提供 SSE 迭代器
  3. 提供非流式接口：收集完整输出 → parse_test_points → 标准化字典列表
"""

import json
import logging
from collections.abc import AsyncIterator

from app.ai.parser import parse_test_points
from app.ai.prompts import assemble_prompt
from app.ai.stream_adapter import get_thinking_stream_with_fallback

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════
# Task Instruction 模板
# ═══════════════════════════════════════════════════════════════════

_TASK_TEMPLATE = """\
请为以下需求生成测试点列表：

## 需求标题
{title}

## 需求内容
{content}

## 输出要求
请按照正常流程、异常场景、边界值、并发场景、权限安全分组，
每个测试点包含：group_name（分组名）、title（标题）、description（描述，含预期行为）、\
priority（P0/P1/P2）、estimated_cases（预计用例数）。

## 分析原则
1. 首先提取需求文档中明确描述的功能点
2. 根据数据中台测试经验，补充文档未提及但应测试的场景
3. 识别需求文档中缺失的关键场景并标注高优先级
4. 每个功能点至少拆分到可独立验证的粒度
5. 边界值、异常路径、数据校验必须单独列为测试点

请输出 JSON 数组。"""

_INCREMENTAL_SECTION = """

## 已有测试点（请勿重复，仅补充缺失的）
{existing_summary}"""


def build_task_instruction(
    requirement_title: str,
    requirement_content: str,
    existing_points: list[dict] | None = None,
) -> str:
    """组装 task instruction，包含增量去重上下文。"""
    task = _TASK_TEMPLATE.format(title=requirement_title, content=requirement_content)

    if existing_points:
        lines = [f"- [{p.get('group_name', '')}] {p.get('title', '')}" for p in existing_points]
        task += _INCREMENTAL_SECTION.format(existing_summary="\n".join(lines))

    return task


# ═══════════════════════════════════════════════════════════════════
# 流式生成（供 router 直接 StreamingResponse）
# ═══════════════════════════════════════════════════════════════════


async def generate_scene_map_stream(
    requirement_title: str,
    requirement_content: str,
    existing_points: list[dict] | None = None,
) -> AsyncIterator[str]:
    """返回 SSE 异步迭代器，可直接用于 StreamingResponse。

    使用 ``get_thinking_stream_with_fallback`` 实现重试 + 降级。
    """
    task_instruction = build_task_instruction(requirement_title, requirement_content, existing_points)
    system = assemble_prompt("scene_map", task_instruction)
    messages = [
        {
            "role": "user",
            "content": (
                f"请为以下需求生成测试点列表：\n\n需求标题：{requirement_title}\n\n需求内容：\n{requirement_content}"
            ),
        }
    ]
    return await get_thinking_stream_with_fallback(messages, system=system)


# ═══════════════════════════════════════════════════════════════════
# SSE 文本提取
# ═══════════════════════════════════════════════════════════════════


def extract_content_from_sse(sse_text: str) -> str:
    """从 SSE 格式文本中提取所有 ``event: content`` 的 delta 拼接结果。"""
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


async def generate_scene_map(
    requirement_title: str,
    requirement_content: str,
    existing_points: list[dict] | None = None,
) -> list[dict]:
    """非流式生成：收集完整 SSE 输出 → 解析为标准化测试点列表。

    Returns:
        每个 dict 包含 group_name / title / description / priority /
        estimated_cases / source，可直接用于 ``SceneMapService.add_test_point``。
    """
    stream = await generate_scene_map_stream(requirement_title, requirement_content, existing_points)

    chunks: list[str] = []
    async for chunk in stream:
        chunks.append(chunk)

    full_sse = "".join(chunks)
    full_text = extract_content_from_sse(full_sse)

    points = parse_test_points(full_text)

    standardized = _standardize_points(points)
    logger.info("生成 %d 个测试点 (title=%s)", len(standardized), requirement_title)
    return standardized


def _standardize_points(raw_points: list[dict]) -> list[dict]:
    """将 parse_test_points 输出标准化为 TestPoint 模型兼容字段。"""
    results: list[dict] = []
    for p in raw_points:
        results.append(
            {
                "group_name": p.get("group_name", "未分组"),
                "title": p.get("title", "未命名测试点"),
                "description": p.get("description", ""),
                "priority": p.get("priority", "P1"),
                "estimated_cases": int(p.get("estimated_cases", 3)),
                "source": "ai",
            }
        )
    return results
