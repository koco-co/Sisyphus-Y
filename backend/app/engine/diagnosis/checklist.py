"""行业必问清单 — 数据中台场景下需求文档必须覆盖的检查项。

基于 RULE-DATAPLAT 中定义的 8 类必测场景，构建规则化检查清单。
对每个检查项，判断需求文档是否已覆盖。
"""

import logging

logger = logging.getLogger(__name__)

# 行业必问清单：关键词 + 描述
INDUSTRY_CHECKLIST: list[dict] = [
    {
        "id": "CHK-001",
        "category": "数据同步",
        "title": "全量/增量同步策略",
        "keywords": ["全量同步", "增量同步", "断点续传", "数据同步", "CDC"],
        "description": "需求是否明确说明数据同步方式（全量/增量）及断点续传机制",
    },
    {
        "id": "CHK-002",
        "category": "调度任务",
        "title": "任务调度与失败处理",
        "keywords": ["调度", "定时", "重试", "超时", "失败", "DolphinScheduler", "Airflow"],
        "description": "是否定义了任务调度策略、失败重试次数及超时终止条件",
    },
    {
        "id": "CHK-003",
        "category": "字段映射",
        "title": "数据类型转换与精度",
        "keywords": ["类型转换", "字段映射", "精度", "空值", "NULL", "字符集"],
        "description": "是否说明字段类型转换规则、空值处理策略及精度保持方案",
    },
    {
        "id": "CHK-004",
        "category": "大表分页",
        "title": "大数据量分页查询",
        "keywords": ["分页", "大表", "游标", "深度分页", "百万"],
        "description": "大数据量场景的分页方案是否明确（深度分页/游标分页）",
    },
    {
        "id": "CHK-005",
        "category": "权限隔离",
        "title": "多租户权限隔离",
        "keywords": ["权限", "隔离", "租户", "脱敏", "行级", "列级", "RBAC"],
        "description": "是否定义多租户数据隔离策略、行列级权限及数据脱敏规则",
    },
    {
        "id": "CHK-006",
        "category": "审计日志",
        "title": "操作审计与告警",
        "keywords": ["审计", "日志", "留痕", "告警", "敏感操作"],
        "description": "是否要求关键操作留痕、敏感操作告警及日志防篡改",
    },
    {
        "id": "CHK-007",
        "category": "数据血缘",
        "title": "血缘追溯与影响分析",
        "keywords": ["血缘", "溯源", "上下游", "影响分析", "lineage"],
        "description": "是否涵盖数据血缘追溯能力及变更影响分析",
    },
    {
        "id": "CHK-008",
        "category": "数据质量",
        "title": "质量规则与校验",
        "keywords": ["质量", "空值率", "唯一性", "一致性", "时效性", "DQ"],
        "description": "是否定义数据质量校验规则（空值率/唯一性/一致性/时效性）",
    },
    {
        "id": "CHK-009",
        "category": "幂等性",
        "title": "写入操作幂等性",
        "keywords": ["幂等", "重复", "去重", "upsert"],
        "description": "写入操作是否保证幂等性，重复执行不产生副作用",
    },
    {
        "id": "CHK-010",
        "category": "时区处理",
        "title": "时区与时间格式",
        "keywords": ["时区", "UTC", "北京时间", "时间戳", "timezone"],
        "description": "时间相关功能是否明确时区处理规则（UTC vs 本地时间）",
    },
]


def match_checklist(requirement_text: str) -> dict:
    """将需求文档与行业必问清单进行匹配。

    Returns:
        dict: {
            "matched": [已覆盖的检查项],
            "unmatched": [未覆盖的检查项],
            "coverage_rate": 覆盖率 (0.0 ~ 1.0),
        }
    """
    text_lower = requirement_text.lower()
    matched: list[dict] = []
    unmatched: list[dict] = []

    for item in INDUSTRY_CHECKLIST:
        found = any(kw.lower() in text_lower for kw in item["keywords"])
        if found:
            matched.append(item)
        else:
            unmatched.append(item)

    total = len(INDUSTRY_CHECKLIST)
    coverage = len(matched) / total if total > 0 else 0.0

    logger.info("清单匹配完成: %d/%d 已覆盖 (%.0f%%)", len(matched), total, coverage * 100)

    return {
        "matched": matched,
        "unmatched": unmatched,
        "coverage_rate": round(coverage, 2),
    }


def get_unmatched_checklist_items(requirement_text: str) -> list[dict]:
    """获取需求文档中未覆盖的行业检查项。"""
    result = match_checklist(requirement_text)
    return result["unmatched"]


def get_checklist_summary(requirement_text: str) -> str:
    """生成行业清单匹配的文本摘要，用于注入到 LLM Prompt 中。"""
    result = match_checklist(requirement_text)

    lines = [f"行业清单覆盖率: {result['coverage_rate']:.0%}"]

    if result["unmatched"]:
        lines.append("\n未覆盖的必检项：")
        for item in result["unmatched"]:
            lines.append(f"  - [{item['id']}] {item['title']}: {item['description']}")

    if result["matched"]:
        lines.append(f"\n已覆盖: {len(result['matched'])} 项")

    return "\n".join(lines)
