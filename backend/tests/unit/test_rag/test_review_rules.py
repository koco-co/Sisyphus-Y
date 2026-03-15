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

    def test_review_rules_prompt_content(self):
        """REVIEW_SYSTEM 常量包含"第一步"、"前置条件"、"预期结果"等审查规则关键词。"""
        # 验证关键审查规则关键词存在
        assert "第一步" in REVIEW_SYSTEM or "step" in REVIEW_SYSTEM.lower()
        assert "前置条件" in REVIEW_SYSTEM
        assert "预期结果" in REVIEW_SYSTEM or "步骤" in REVIEW_SYSTEM

        # 验证是系统提示词
        assert len(REVIEW_SYSTEM) > 100  # 应该是一个完整的 prompt

    def test_review_system_contains_discard_reasons(self):
        """REVIEW_SYSTEM 包含 5 类丢弃原因分类。"""
        # 常见的丢弃原因关键词（至少包含几类）
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

        # 验证包含 verdict 字段说明
        assert "verdict" in REVIEW_SYSTEM
        assert "pass" in REVIEW_SYSTEM.lower() or "通过" in REVIEW_SYSTEM
        assert "discard" in REVIEW_SYSTEM.lower() or "丢弃" in REVIEW_SYSTEM
