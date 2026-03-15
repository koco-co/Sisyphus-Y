"""RAG-04: 报告格式测试。"""

import importlib.util
import os
import sys
from unittest.mock import patch

import pytest

# 添加项目根目录到路径
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
SCRIPTS_DIR = os.path.join(PROJECT_ROOT, "scripts")
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, SCRIPTS_DIR)
sys.path.insert(0, BACKEND_DIR)

# 导入被测模块
spec = importlib.util.spec_from_file_location("review_testcases", os.path.join(SCRIPTS_DIR, "review_testcases.py"))
review_module = importlib.util.module_from_spec(spec)

# Mock 依赖项
with patch.dict('os.environ'):
    spec.loader.exec_module(review_module)

generate_report = review_module.generate_report


class TestReportJsonFields:
    """测试报告 JSON 字段。"""

    def test_report_json_fields(self):
        """生成的 report dict 包含 total, passed, polished, discarded, discard_reasons 字段。"""
        # 模拟审查结果
        review_results = [
            {"verdict": "pass"},
            {"verdict": "pass"},
            {"verdict": "polish", "polished": {"title": "test"}},
            {"verdict": "discard", "discard_reason": "步骤缺失"},
            {"verdict": "discard", "discard_reason": "步骤缺失"},
            {"verdict": "discard", "discard_reason": "无法修复"},
        ]

        report = generate_report(review_results)

        # 验证必需字段
        assert "total" in report
        assert "passed" in report
        assert "polished" in report
        assert "discarded" in report
        assert "discard_reasons" in report

        # 验证数值正确
        assert report["total"] == 6
        assert report["passed"] == 2
        assert report["polished"] == 1
        assert report["discarded"] == 3

    def test_discard_reasons_are_grouped(self):
        """相同原因被计数（{"步骤缺失": 3, "无法修复": 1}）。"""
        review_results = [
            {"verdict": "discard", "discard_reason": "步骤缺失"},
            {"verdict": "discard", "discard_reason": "步骤缺失"},
            {"verdict": "discard", "discard_reason": "步骤缺失"},
            {"verdict": "discard", "discard_reason": "无法修复"},
        ]

        report = generate_report(review_results)

        # 验证 discard_reasons 是 dict 且正确分组计数
        assert isinstance(report["discard_reasons"], dict)
        assert report["discard_reasons"]["步骤缺失"] == 3
        assert report["discard_reasons"]["无法修复"] == 1
        assert report["discarded"] == 4
