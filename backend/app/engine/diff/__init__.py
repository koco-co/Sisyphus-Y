"""Diff 引擎 — 变更影响分析、测试点建议、用例重生成。"""

from app.engine.diff.impact_analyzer import mark_affected_test_cases, mark_affected_test_points
from app.engine.diff.regenerator import regenerate_cases_for_points
from app.engine.diff.suggestion import suggest_new_test_points

__all__ = [
    "mark_affected_test_cases",
    "mark_affected_test_points",
    "regenerate_cases_for_points",
    "suggest_new_test_points",
]
