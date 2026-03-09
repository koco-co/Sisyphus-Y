"""基于 Diff 变更建议新增测试点 (B-M07-06)。

流程：
  1. 将 diff 摘要 + 现有测试点列表组装为 task instruction
  2. 通过 assemble_prompt 使用 diff 模块 Prompt
  3. 调用 invoke_llm 获取建议
  4. 安全提取 JSON 数组并返回结构化建议
"""

import json
import logging
import re

from app.ai.llm_client import invoke_llm
from app.ai.prompts import assemble_prompt

logger = logging.getLogger(__name__)


_SUGGESTION_TASK = """\
基于以下需求变更内容，分析是否需要新增测试点。

## 变更摘要
{diff_summary}

## 现有测试点
{existing_points}

## 输出要求
请严格按照以下规则分析并输出：
1. 如果变更引入了新功能、新接口、新状态，必须建议对应的测试点
2. 如果变更修改了数据处理逻辑，需要建议幂等性/大数据量/边界值测试点
3. 不要建议与已有测试点重复的内容

如果需要新增测试点，以 JSON 数组输出：
[{{"name": "测试点名称", "description": "测试点描述", \
"category": "normal/exception/boundary/concurrent/permission", \
"priority": "P0/P1/P2", "reason": "新增原因"}}]
如果不需要新增，输出空数组 []"""


async def suggest_new_test_points(
    diff_summary: str,
    existing_points: list[dict],
) -> list[dict]:
    """基于 diff 变更建议新增测试点。

    Args:
        diff_summary: diff 变更摘要文本
        existing_points: 现有测试点列表，含 name/title + description

    Returns:
        建议的新测试点列表，每项含 name / description / category / priority / reason
    """
    points_text = "\n".join(
        f"- {p.get('name') or p.get('title', '')}: {p.get('description', '')}" for p in existing_points
    )

    task = _SUGGESTION_TASK.format(
        diff_summary=diff_summary,
        existing_points=points_text or "（无现有测试点）",
    )

    system = assemble_prompt(module="diff", task_instruction=task)
    messages = [{"role": "user", "content": task}]

    result = await invoke_llm(messages=[{"role": "system", "content": system}, *messages])
    content = result.content

    # 安全提取 JSON 数组
    match = re.search(r"\[.*\]", content, re.DOTALL)
    if not match:
        logger.debug("LLM 未返回建议（无 JSON 数组），原文: %s", content[:200])
        return []

    try:
        suggestions = json.loads(match.group())
    except json.JSONDecodeError:
        logger.warning("LLM 返回 JSON 解析失败: %s", content[:300])
        return []

    # 过滤无效项
    valid = [s for s in suggestions if isinstance(s, dict) and s.get("name")]
    logger.info("AI 建议新增 %d 个测试点", len(valid))
    return valid
