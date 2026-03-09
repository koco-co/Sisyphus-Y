"""需求质量评估器 — 评估需求文档在完整性、清晰性、可测试性、一致性四个维度的质量。"""

import json
import logging
import re

from app.ai.llm_client import invoke_llm
from app.ai.prompts import assemble_prompt

logger = logging.getLogger(__name__)

QUALITY_DIMENSIONS = [
    {"name": "completeness", "label": "完整性", "weight": 0.3},
    {"name": "clarity", "label": "清晰性", "weight": 0.25},
    {"name": "testability", "label": "可测试性", "weight": 0.25},
    {"name": "consistency", "label": "一致性", "weight": 0.2},
]

QUALITY_EVAL_TASK = """请评估以下需求文档的质量，从 4 个维度打分（0-100）：

## 需求文档
{requirement_text}

## 评分维度
1. completeness（完整性）：功能点是否完整，是否有遗漏
2. clarity（清晰性）：描述是否明确，是否有歧义
3. testability（可测试性）：是否可以编写测试用例验证
4. consistency（一致性）：各处描述是否一致，是否有矛盾

## 输出格式（严格 JSON）
{{
  "scores": {{
    "completeness": 85,
    "clarity": 70,
    "testability": 60,
    "consistency": 90
  }},
  "issues": [
    {{"dimension": "clarity", "description": "第3节中XXX描述模糊"}}
  ],
  "overall": 75
}}"""


async def evaluate_requirement_quality(requirement_text: str) -> dict:
    """评估需求质量，返回评分和问题列表。

    Returns:
        dict: {
            "scores": {"completeness": int, "clarity": int, ...},
            "issues": [{"dimension": str, "description": str}],
            "overall": int,
        }
    """
    task = QUALITY_EVAL_TASK.format(requirement_text=requirement_text)
    system = assemble_prompt("diagnosis", task)
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": f"请评估以下需求的质量：\n\n{requirement_text}"},
    ]

    result = await invoke_llm(messages)

    content = result.content
    match = re.search(r"\{.*\}", content, re.DOTALL)
    if not match:
        raise ValueError(f"质量评估返回格式异常: {content[:200]}")

    data = json.loads(match.group())

    # 确保字段完整并重新计算加权总分
    scores = data.get("scores", {})
    overall = sum(scores.get(d["name"], 0) * d["weight"] for d in QUALITY_DIMENSIONS)
    data["overall"] = round(overall)

    if "issues" not in data:
        data["issues"] = []

    logger.info("质量评估完成，总分: %d", data["overall"])
    return data
