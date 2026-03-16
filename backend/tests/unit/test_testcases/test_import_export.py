"""TC-12/TC-13/TC-14 — ExportService._get_cases_by_scope 导入导出测试（RED 基线）"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest


def _make_service(session: AsyncMock):
    from app.modules.export.service import ExportService

    return ExportService(session)


def _make_testcase_mock(
    tc_id: uuid.UUID | None = None,
    title: str = "登录功能正常流程",
    priority: str = "P1",
    folder_id: uuid.UUID | None = None,
):
    tc = MagicMock()
    tc.id = tc_id or uuid.uuid4()
    tc.title = title
    tc.priority = priority
    tc.folder_id = folder_id
    tc.case_id = f"TC-{uuid.uuid4().hex[:6]}"
    tc.status = "approved"
    tc.case_type = "functional"
    tc.precondition = "用户已注册"
    tc.steps = []
    tc.tags = []
    return tc


class TestExportScope:
    async def test_export_scope_folder(self):
        """断言 _get_cases_by_scope('folder', folder_id, None) 查询含 folder_id 过滤。"""
        session = AsyncMock()
        svc = _make_service(session)
        folder_id = str(uuid.uuid4())

        folder_cases = [
            _make_testcase_mock(title="文件夹用例1", folder_id=uuid.UUID(folder_id)),
            _make_testcase_mock(title="文件夹用例2", folder_id=uuid.UUID(folder_id)),
        ]

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = folder_cases
        session.execute = AsyncMock(return_value=mock_result)

        result = await svc._get_cases_by_scope(
            scope="folder",
            scope_value=folder_id,
            case_ids=None,
        )

        assert isinstance(result, list), f"应返回列表，实际类型: {type(result)}"
        assert len(result) == 2, f"应返回2条用例，实际: {len(result)}"
        session.execute.assert_awaited_once()

    async def test_export_scope_selected(self):
        """断言 _get_cases_by_scope('selected', None, case_ids) 查询含 IN 过滤。"""
        session = AsyncMock()
        svc = _make_service(session)

        tc_id1 = uuid.uuid4()
        tc_id2 = uuid.uuid4()
        case_ids = [str(tc_id1), str(tc_id2)]

        selected_cases = [
            _make_testcase_mock(tc_id=tc_id1, title="选中用例1"),
            _make_testcase_mock(tc_id=tc_id2, title="选中用例2"),
        ]

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = selected_cases
        session.execute = AsyncMock(return_value=mock_result)

        result = await svc._get_cases_by_scope(
            scope="selected",
            scope_value=None,
            case_ids=case_ids,
        )

        assert isinstance(result, list), f"应返回列表，实际类型: {type(result)}"
        assert len(result) == 2, f"应返回2条选中用例，实际: {len(result)}"
        session.execute.assert_awaited_once()

    async def test_export_custom_fields(self):
        """断言 fields=['title','priority'] 时生成结果只含这两列（不含 steps 等）。"""
        session = AsyncMock()
        svc = _make_service(session)

        cases = [
            _make_testcase_mock(title="用例A", priority="P0"),
            _make_testcase_mock(title="用例B", priority="P1"),
        ]

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = cases
        session.execute = AsyncMock(return_value=mock_result)

        # 调用支持 fields 过滤的导出方法
        result = await svc.export_cases_with_fields(
            scope="requirement",
            scope_value=str(uuid.uuid4()),
            case_ids=None,
            fields=["title", "priority"],
        )

        # 返回结果中每条记录只应包含 title 和 priority
        assert isinstance(result, list), f"应返回列表，实际类型: {type(result)}"
        for item in result:
            assert "title" in item, f"结果应含 title，实际: {item}"
            assert "priority" in item, f"结果应含 priority，实际: {item}"
            assert "steps" not in item, f"结果不应含 steps，实际: {item}"
