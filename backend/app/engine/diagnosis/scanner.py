"""广度扫描器 — 对需求文档进行 6 维度风险扫描。

扫描维度：
  1. 异常路径遗漏
  2. 边界值模糊
  3. 权限与安全
  4. 并发与性能
  5. 状态流转
  6. 跨模块依赖
"""

import json
import logging
import re

from app.ai.llm_client import invoke_llm
from app.ai.prompts import assemble_prompt

logger = logging.getLogger(__name__)

SCAN_DIMENSIONS = [
    "异常路径遗漏",
    "边界值模糊",
    "权限与安全",
    "并发与性能",
    "状态流转",
    "跨模块依赖",
]

SCANNER_TASK = """请对以下需求文档进行广度扫描分析，从 6 个维度逐一识别风险。

## 需求文档
{requirement_text}

## 输出格式
请输出 JSON 数组，每个风险项包含：
[
  {{
    "dimension": "异常路径遗漏/边界值模糊/权限与安全/并发与性能/状态流转/跨模块依赖",
    "title": "风险点标题",
    "description": "风险描述",
    "risk_level": "high/medium/low",
    "suggestion": "改善建议"
  }}
]

注意：每个维度至少检查一次，即使没有问题也要说明"该维度暂无风险"。"""


async def scan_requirement(requirement_text: str) -> list[dict]:
    """对需求文档执行 6 维度广度扫描，返回风险项列表。

    Returns:
        list[dict]: 每项包含 dimension, title, description, risk_level, suggestion
    """
    task = SCANNER_TASK.format(requirement_text=requirement_text)
    system = assemble_prompt("diagnosis", task)
    messages = [{"role": "user", "content": f"请执行分析扫描：\n\n{requirement_text}"}]

    result = await invoke_llm([{"role": "system", "content": system}, *messages])

    content = result.content
    match = re.search(r"\[.*\]", content, re.DOTALL)
    if not match:
        logger.warning("扫描器返回格式异常，无法提取 JSON: %s", content[:200])
        return []

    try:
        data = json.loads(match.group())
    except json.JSONDecodeError:
        logger.warning("扫描器返回 JSON 解析失败: %s", content[:200])
        return []

    risks: list[dict] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        risks.append(
            {
                "dimension": item.get("dimension", "未分类"),
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "risk_level": item.get("risk_level", "medium"),
                "suggestion": item.get("suggestion", ""),
            }
        )

    logger.info("广度扫描完成，识别 %d 个风险项", len(risks))
    return risks
