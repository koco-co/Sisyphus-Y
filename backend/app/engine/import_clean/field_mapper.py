"""AI 字段语义映射 — 将导入文件列名映射到系统标准字段。"""

from __future__ import annotations

import json
import logging
import re

from app.ai.llm_client import invoke_llm

logger = logging.getLogger(__name__)

SYSTEM_FIELDS = {
    "title": "用例标题",
    "precondition": "前置条件",
    "steps": "测试步骤",
    "expected_result": "预期结果",
    "priority": "优先级 (P0/P1/P2/P3)",
    "module": "所属模块",
    "case_type": "用例类型 (functional/boundary/exception/performance)",
    "tags": "标签",
    "description": "用例描述",
    "status": "用例状态",
}

FIELD_MAP_PROMPT = """你是一个测试用例字段映射助手。分析用户导入文件中的列名，将其映射到系统标准字段。

## 系统标准字段
{system_fields}

## 用户文件列名
{user_columns}

## 输出要求
返回 JSON 对象，key 为用户列名，value 为系统字段名（从上面标准字段中选择）。
如果某列无法映射，value 设为 null。
只输出 JSON，不要其他内容。

## 示例
{{"用例名称": "title", "步骤": "steps", "期望结果": "expected_result", "备注": null}}
"""


async def map_fields(column_names: list[str]) -> dict[str, str | None]:
    """使用 AI 将导入文件列名映射到系统标准字段。

    Args:
        column_names: 导入文件的列名列表

    Returns:
        dict: {原列名: 系统字段名 | None}
    """
    if not column_names:
        return {}

    # 先尝试规则匹配，能覆盖大部分常见情况
    result = _rule_based_mapping(column_names)
    unmapped = [col for col in column_names if result.get(col) is None]

    if not unmapped:
        logger.info("字段映射（规则）完成: %s", result)
        return result

    # 有未映射字段时调用 AI
    try:
        ai_result = await _ai_mapping(column_names)
        result.update({k: v for k, v in ai_result.items() if v is not None and k in unmapped})
    except Exception:
        logger.warning("AI 字段映射失败，仅使用规则映射", exc_info=True)

    logger.info("字段映射完成: %s", result)
    return result


def _rule_based_mapping(column_names: list[str]) -> dict[str, str | None]:
    """基于关键词的规则映射。"""
    rules: dict[str, list[str]] = {
        "title": ["标题", "用例名", "用例标题", "case name", "case title", "title", "名称", "测试项"],
        "precondition": ["前置", "前提", "precondition", "前置条件"],
        "steps": ["步骤", "操作步骤", "测试步骤", "step", "steps", "操作"],
        "expected_result": ["预期", "期望", "预期结果", "期望结果", "expected", "expected result"],
        "priority": ["优先级", "priority", "级别", "等级"],
        "module": ["模块", "module", "功能模块", "所属模块"],
        "case_type": ["类型", "用例类型", "type", "case type"],
        "tags": ["标签", "tag", "tags", "关键字"],
        "description": ["描述", "说明", "备注", "description", "remark", "用例描述"],
        "status": ["状态", "status"],
    }

    result: dict[str, str | None] = {}
    used_fields: set[str] = set()

    for col in column_names:
        col_lower = col.lower().strip()
        matched = False
        for field, keywords in rules.items():
            if field in used_fields:
                continue
            if col_lower in [kw.lower() for kw in keywords]:
                result[col] = field
                used_fields.add(field)
                matched = True
                break
        if not matched:
            result[col] = None

    return result


async def _ai_mapping(column_names: list[str]) -> dict[str, str | None]:
    """调用 LLM 做字段映射。"""
    fields_desc = "\n".join(f"- {k}: {v}" for k, v in SYSTEM_FIELDS.items())
    columns_desc = ", ".join(f'"{c}"' for c in column_names)

    prompt = FIELD_MAP_PROMPT.format(system_fields=fields_desc, user_columns=columns_desc)
    result = await invoke_llm([{"role": "user", "content": prompt}])

    match = re.search(r"\{.*\}", result.content, re.DOTALL)
    if not match:
        raise ValueError(f"AI 返回格式异常: {result.content[:200]}")

    data = json.loads(match.group())
    valid_fields = set(SYSTEM_FIELDS.keys())
    return {k: (v if v in valid_fields else None) for k, v in data.items()}
