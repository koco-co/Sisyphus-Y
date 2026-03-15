"""RAG-02/03: 审查判断逻辑 + 三分支决策测试。"""

import importlib.util
import os
import sys
from unittest.mock import MagicMock, patch

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

review_case = review_module.review_case


class TestParsePassVerdict:
    """测试通过 verdict 解析。"""

    @pytest.mark.asyncio
    async def test_parse_pass_verdict(self):
        """LLM 返回 {"verdict": "pass"} 时，走入库分支。"""
        with patch.object(review_module, "invoke_llm") as mock_invoke:
            mock_result = MagicMock()
            mock_result.content = '{"verdict": "pass"}'
            mock_invoke.return_value = mock_result

            result = await review_case("测试用例文本")

            assert result["verdict"] == "pass"
            assert "polished" not in result or result.get("polished") is None
            assert "discard_reason" not in result or result.get("discard_reason") is None


class TestParsePolishVerdict:
    """测试润色 verdict 解析。"""

    @pytest.mark.asyncio
    async def test_parse_polish_verdict(self):
        """LLM 返回 {"verdict": "polish", "polished": {...}} 时，用润色后内容入库。"""
        polished_content = {
            "title": "优化后的标题",
            "precondition": "优化后的前置条件",
            "steps": "优化后的步骤",
            "expected": "优化后的预期结果",
        }

        with patch.object(review_module, "invoke_llm") as mock_invoke:
            mock_result = MagicMock()
            mock_result.content = f'{{"verdict": "polish", "polished": {str(polished_content).replace(chr(39), chr(34))}}}'
            mock_invoke.return_value = mock_result

            result = await review_case("测试用例文本")

            assert result["verdict"] == "polish"
            assert "polished" in result


class TestParseDiscardVerdict:
    """测试丢弃 verdict 解析。"""

    @pytest.mark.asyncio
    async def test_parse_discard_verdict(self):
        """LLM 返回 {"verdict": "discard", "discard_reason": "步骤缺失"} 时，不入库，记录原因。"""
        with patch.object(review_module, "invoke_llm") as mock_invoke:
            mock_result = MagicMock()
            mock_result.content = '{"verdict": "discard", "discard_reason": "步骤缺失"}'
            mock_invoke.return_value = mock_result

            result = await review_case("测试用例文本")

            assert result["verdict"] == "discard"
            assert result["discard_reason"] == "步骤缺失"


class TestInvalidResponse:
    """测试无效响应处理。"""

    @pytest.mark.asyncio
    async def test_invalid_llm_response_defaults_to_discard(self):
        """LLM 返回非 JSON 时，verdict 降级为 discard。"""
        with patch.object(review_module, "invoke_llm") as mock_invoke:
            mock_result = MagicMock()
            mock_result.content = "这不是有效的 JSON 响应"
            mock_invoke.return_value = mock_result

            result = await review_case("测试用例文本")

            assert result["verdict"] == "discard"
            assert "discard_reason" in result
            assert "无法修复" in result["discard_reason"] or "JSON" in result["discard_reason"]


class TestVerdictToActionMapping:
    """测试 verdict 到 action 的映射关系。"""

    @pytest.mark.asyncio
    async def test_verdict_to_action_mapping(self):
        """端到端场景——mock invoke_llm 分别返回不同 verdict，验证下游分支映射正确。"""
        test_cases = [
            # (mock_response, expected_verdict, should_index)
            ('{"verdict": "pass"}', "pass", True),
            ('{"verdict": "polish", "polished": {"title": "test"}}', "polish", True),
            ('{"verdict": "discard", "discard_reason": "步骤缺失"}', "discard", False),
        ]

        for mock_response, expected_verdict, should_index in test_cases:
            with patch.object(review_module, "invoke_llm") as mock_invoke:
                mock_result = MagicMock()
                mock_result.content = mock_response
                mock_invoke.return_value = mock_result

                result = await review_case("测试用例文本")

                assert result["verdict"] == expected_verdict, f"期望 verdict={expected_verdict}, 实际={result['verdict']}"

                # 验证是否应该入库
                if should_index:
                    assert result["verdict"] in ("pass", "polish")
                else:
                    assert result["verdict"] == "discard"
