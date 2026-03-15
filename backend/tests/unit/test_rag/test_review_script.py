"""RAG-01: CSV 读取 + LLM mock 调用测试。"""

import csv
import hashlib
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

read_csv_cases = review_module.read_csv_cases
make_point_id = review_module.make_point_id
review_case = review_module.review_case


class TestReadCsvSample:
    """测试 CSV 采样读取。"""

    def test_read_csv_sample(self, tmp_path):
        """读取真实 CSV 文件（或 fixture），--sample 3 时最多返回 3 行。"""
        # 创建临时 CSV 文件（带 BOM）
        csv_content = """用例编号,用例标题,所属模块,相关需求,前置条件,步骤,预期结果,优先级,用例类型
TC001,登录测试,用户模块,REQ-001,已注册用户,输入用户名,登录成功,P0,功能测试
TC002,注册测试,用户模块,REQ-002,无,输入信息,注册成功,P1,功能测试
TC003,退出测试,用户模块,REQ-003,已登录,点击退出,退出成功,P2,功能测试
TC004,查询测试,数据模块,REQ-004,有数据,点击查询,显示结果,P0,功能测试
"""
        csv_file = tmp_path / "test_cases.csv"
        csv_file.write_bytes(b"\xef\xbb\xbf" + csv_content.encode("utf-8"))

        # 测试 sample=3
        cases = read_csv_cases(str(csv_file), sample=3)
        assert len(cases) == 3
        assert cases[0]["用例编号"] == "TC001"
        assert cases[1]["用例编号"] == "TC002"
        assert cases[2]["用例编号"] == "TC003"

        # 测试不限制 sample
        all_cases = read_csv_cases(str(csv_file), sample=None)
        assert len(all_cases) == 4


class TestMakePointId:
    """测试 ID 生成函数。"""

    def test_make_point_id_stable(self):
        """同 file_path + row_index 输入两次生成相同 ID。"""
        file_path = "/data/cases.csv"
        row_index = 42

        id1 = make_point_id(file_path, row_index)
        id2 = make_point_id(file_path, row_index)

        assert id1 == id2
        assert len(id1) == 32  # md5 hex length

    def test_make_point_id_different(self):
        """不同 row_index 生成不同 ID。"""
        file_path = "/data/cases.csv"

        id1 = make_point_id(file_path, 0)
        id2 = make_point_id(file_path, 1)
        id3 = make_point_id(file_path, 2)

        assert id1 != id2
        assert id2 != id3
        assert id1 != id3


class TestReviewCaseIntegration:
    """测试 review_case 与 invoke_llm 的集成。"""

    @pytest.mark.asyncio
    async def test_review_case_calls_invoke_llm(self):
        """review_case 应该调用 invoke_llm 并解析返回结果。"""
        # 这里测试脚本级别的集成，需要 mock invoke_llm
        case_text = "用例: 登录测试\n前置条件: 已注册\n步骤: 输入用户名\n预期: 登录成功"

        with patch.object(review_module, "invoke_llm") as mock_invoke:
            mock_result = MagicMock()
            mock_result.content = '{"verdict": "pass"}'
            mock_invoke.return_value = mock_result

            result = await review_case(case_text)

            # 验证 invoke_llm 被调用
            mock_invoke.assert_called_once()
            assert result["verdict"] == "pass"
