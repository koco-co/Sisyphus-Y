"""测试点粒度校验 — 确保测试点可独立验证、描述充分。

校验规则按严重程度分为 warning / info 两级，
返回原始测试点 + ``warnings`` 列表，不修改原始数据。
"""

import logging
import re

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════
# 粒度校验规则
# ═══════════════════════════════════════════════════════════════════

GRANULARITY_RULES: list[dict] = [
    {
        "name": "名称过长",
        "level": "warning",
        "check": lambda p: len(p.get("title", "")) > 50,
        "suggestion": "测试点名称超过 50 字，可能需要拆分为更细粒度的测试点",
    },
    {
        "name": "描述过短",
        "level": "warning",
        "check": lambda p: len(p.get("description", "")) < 10,
        "suggestion": "测试点描述不足 10 字，需要补充预期行为和验证标准",
    },
    {
        "name": "含多个动作",
        "level": "warning",
        "check": lambda p: bool(re.search(r"(?:并且|同时|以及|然后|接着)", p.get("title", ""))),
        "suggestion": "测试点名称包含多个动作连接词，建议拆分为独立测试点",
    },
    {
        "name": "缺少预期结果",
        "level": "warning",
        "check": lambda p: (
            not re.search(
                r"(?:应|预期|期望|返回|显示|提示|报错|校验|验证|确认|生成|输出)",
                p.get("description", ""),
            )
        ),
        "suggestion": "测试点描述未包含明确的预期结果关键词",
    },
    {
        "name": "预计用例数异常",
        "level": "info",
        "check": lambda p: int(p.get("estimated_cases", 3)) > 8,
        "suggestion": "预计用例数超过 8 条，粒度可能过粗，建议拆分",
    },
    {
        "name": "缺少分组",
        "level": "info",
        "check": lambda p: not p.get("group_name") or p.get("group_name") == "未分组",
        "suggestion": "测试点缺少分组归属，建议指定场景分组",
    },
]


def validate_test_points(points: list[dict]) -> list[dict]:
    """校验测试点粒度，返回带 ``warnings`` 字段的测试点列表。

    每个 warning 包含 ``rule``（规则名称）、``level`` 和 ``suggestion``。
    不修改原始 dict，返回浅拷贝。
    """
    results: list[dict] = []
    for point in points:
        warnings: list[dict] = []
        for rule in GRANULARITY_RULES:
            try:
                if rule["check"](point):
                    warnings.append(
                        {
                            "rule": rule["name"],
                            "level": rule["level"],
                            "suggestion": rule["suggestion"],
                        }
                    )
            except Exception:
                logger.debug("规则 '%s' 执行异常，跳过", rule["name"], exc_info=True)

        results.append({**point, "warnings": warnings})

    warn_count = sum(1 for r in results if r["warnings"])
    logger.info("粒度校验完成: %d 个测试点, %d 个有告警", len(points), warn_count)
    return results


def get_validation_summary(validated_points: list[dict]) -> dict:
    """汇总校验结果统计。"""
    total = len(validated_points)
    with_warnings = sum(1 for p in validated_points if p.get("warnings"))
    rule_counts: dict[str, int] = {}
    for p in validated_points:
        for w in p.get("warnings", []):
            name = w["rule"]
            rule_counts[name] = rule_counts.get(name, 0) + 1

    return {
        "total_points": total,
        "points_with_warnings": with_warnings,
        "pass_rate": round((total - with_warnings) / total * 100, 1) if total else 0,
        "rule_hit_counts": rule_counts,
    }
