"""RAG-02: Prompt 文本验证测试。"""

import os
import sys

import pytest

# 添加项目根目录到路径
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
SCRIPTS_DIR = os.path.join(PROJECT_ROOT, "scripts")
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, SCRIPTS_DIR)
sys.path.insert(0, BACKEND_DIR)

# 导入被测模块
import importlib.util
spec = importlib.util.spec_from_file_location("review_testcases", os.path.join(SCRIPTS_DIR, "review_testcases.py"))
review_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review_module)
REVIEW_SYSTEM = review_module.REVIEW_SYSTEM


class TestReviewRulesPrompt:
    """测试 REVIEW_SYSTEM Prompt 内容。"""

    def test_review_system_contains_step_rule(self):
        """REVIEW_SYSTEM 包含"步骤"相关规则。"""
        assert "步骤" in REVIEW_SYSTEM
        assert "测试步骤" in REVIEW_SYSTEM or "可执行" in REVIEW_SYSTEM

    def test_review_system_contains_expected_result_rule(self):
        """REVIEW_SYSTEM 包含"预期结果"相关规则。"""
        assert "预期结果" in REVIEW_SYSTEM
        assert "验证" in REVIEW_SYSTEM or "明确" in REVIEW_SYSTEM

    def test_review_system_contains_precondition_rule(self):
        """REVIEW_SYSTEM 包含"前置条件"相关规则。"""
        assert "前置条件" in REVIEW_SYSTEM
        assert "前提" in REVIEW_SYSTEM or "必要" in REVIEW_SYSTEM

    def test_review_system_verdict_values(self):
        """REVIEW_SYSTEM 定义三种 verdict（pass/polish/discard）。"""
        assert "verdict" in REVIEW_SYSTEM
        assert "pass" in REVIEW_SYSTEM.lower()
        assert "polish" in REVIEW_SYSTEM.lower()
        assert "discard" in REVIEW_SYSTEM.lower()

    def test_review_system_discard_reasons(self):
        """REVIEW_SYSTEM 包含丢弃原因分类（步骤缺失/预期缺失/无法修复/重复用例/无效用例）。"""
        discard_indicators = [
            "步骤缺失",
            "预期缺失",
            "无法修复",
            "重复",
            "无效",
        ]

        # 验证至少包含部分丢弃原因指示
        found = sum(1 for indicator in discard_indicators if indicator in REVIEW_SYSTEM)
        assert found >= 2, f"REVIEW_SYSTEM 应包含至少 2 类丢弃原因，实际找到 {found} 类"

    def test_review_system_output_format(self):
        """REVIEW_SYSTEM 定义 JSON 输出格式。"""
        assert "JSON" in REVIEW_SYSTEM or "json" in REVIEW_SYSTEM.lower()
        assert "```" in REVIEW_SYSTEM  # 应包含代码块示例
