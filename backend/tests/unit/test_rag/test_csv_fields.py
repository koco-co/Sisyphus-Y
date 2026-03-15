"""RAG-07: CSV BOM 解析 + 中文字段名验证测试。"""

import csv
import io

import pytest


class TestBomParsing:
    """测试 CSV BOM 处理。"""

    def test_bom_parsing(self):
        """给定含 BOM 的 CSV bytes，用 utf-8-sig 读取后第一列字段名为"用例编号"（无 BOM 前缀）。"""
        # 构造含 BOM 的 CSV
        csv_content = "用例编号,用例标题,所属模块\nTC001,测试标题,模块A\n"
        csv_bytes = b"\xef\xbb\xbf" + csv_content.encode("utf-8")

        # 使用 utf-8-sig 读取
        f = io.StringIO(csv_bytes.decode("utf-8-sig"))
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []

        # 验证第一列字段名无 BOM 前缀
        assert fieldnames[0] == "用例编号"
        assert "\ufeff" not in fieldnames[0]

        # 验证数据正确读取
        rows = list(reader)
        assert len(rows) == 1
        assert rows[0]["用例编号"] == "TC001"


class TestRequiredFields:
    """测试必需字段存在性。"""

    def test_required_fields_present(self):
        """读取后每行都有"用例标题", "前置条件", "步骤", "预期结果", "优先级"。"""
        csv_content = """用例编号,用例标题,所属模块,相关需求,前置条件,步骤,预期结果,优先级,用例类型
TC001,登录测试,用户模块,REQ-001,已注册用户,1.输入用户名 2.点击登录,登录成功,P0,功能测试
"""
        f = io.StringIO(csv_content)
        reader = csv.DictReader(f)
        rows = list(reader)

        assert len(rows) == 1
        row = rows[0]

        # 验证所有必需字段存在
        required_fields = ["用例标题", "前置条件", "步骤", "预期结果", "优先级"]
        for field in required_fields:
            assert field in row, f"缺少必需字段: {field}"
            assert row[field] is not None

        # 验证字段值
        assert row["用例标题"] == "登录测试"
        assert row["前置条件"] == "已注册用户"
        assert row["步骤"] == "1.输入用户名 2.点击登录"
        assert row["预期结果"] == "登录成功"
        assert row["优先级"] == "P0"
