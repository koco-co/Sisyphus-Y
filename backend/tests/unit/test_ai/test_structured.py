"""验证结构化输出模型校验和降级逻辑。"""
import pytest
from unittest.mock import AsyncMock, patch
from pydantic import ValidationError


def test_testcase_pydantic_valid():
    """合法的用例数据通过 Pydantic 校验。"""
    from app.ai.structured import TestCase, TestStep
    case = TestCase(
        title="数据源管理-MySQL连接-正常连接验证",
        priority="P1",
        case_type="normal",
        precondition="1. 已准备 MySQL 测试实例；2. 账号有数据源管理权限。",
        steps=[
            TestStep(step_num=1, action="进入【数据源管理】页面", expected_result="页面正常加载，显示数据源列表"),
        ],
    )
    assert case.priority == "P1"


def test_testcase_pydantic_invalid_priority():
    """非法优先级被 Pydantic 拒绝。"""
    from app.ai.structured import TestCase
    with pytest.raises(ValidationError):
        TestCase(
            title="test",
            priority="P9",  # 非法
            case_type="normal",
            precondition="pre",
            steps=[],
        )


@pytest.mark.asyncio
async def test_generate_cases_structured_fallback():
    """结构化调用失败时降级到 parse_test_cases。"""
    with (
        patch("app.ai.structured.ChatOpenAI") as mock_cls,
        patch("app.ai.structured.parse_test_cases", return_value=[{"title": "fallback"}]) as mock_parse,
    ):
        mock_llm = AsyncMock()
        mock_llm.ainvoke.side_effect = Exception("模型返回格式错误")
        mock_cls.return_value.with_structured_output.return_value = mock_llm

        from app.ai.structured import generate_cases_structured
        result = await generate_cases_structured(
            [{"role": "user", "content": "生成用例"}],
            fallback_text="fallback raw text",
        )
        mock_parse.assert_called_once_with("fallback raw text")
        assert result == [{"title": "fallback"}]
