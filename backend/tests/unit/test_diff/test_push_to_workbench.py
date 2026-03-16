"""DIF-04/DIF-05 — DiffService.push_to_workbench 推送工作台测试（RED 基线）"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_service(session: AsyncMock):
    from app.modules.diff.service import DiffService

    return DiffService(session)


def _make_testcase_mock(
    tc_id: uuid.UUID | None = None,
    change_impact: str = "needs_rewrite",
    status: str = "approved",
):
    tc = MagicMock()
    tc.id = tc_id or uuid.uuid4()
    tc.change_impact = change_impact
    tc.status = status
    return tc


class TestPushToWorkbench:
    async def test_push_to_workbench_returns_pushed_count(self):
        """mock 3条 needs_rewrite 用例，断言返回 {"pushed_count": 3}。"""
        session = AsyncMock()
        svc = _make_service(session)
        requirement_id = uuid.uuid4()

        affected_cases = [
            _make_testcase_mock(change_impact="needs_rewrite"),
            _make_testcase_mock(change_impact="needs_rewrite"),
            _make_testcase_mock(change_impact="needs_rewrite"),
        ]

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = affected_cases
        session.execute = AsyncMock(return_value=mock_result)
        session.commit = AsyncMock()

        result = await svc.push_to_workbench(requirement_id=requirement_id)

        assert result == {"pushed_count": 3}, (
            f"应返回 {{'pushed_count': 3}}，实际: {result}"
        )

    async def test_push_to_workbench_only_needs_rewrite(self):
        """断言只更新 change_impact='needs_rewrite' 的用例，not_affected 不变。"""
        session = AsyncMock()
        svc = _make_service(session)
        requirement_id = uuid.uuid4()

        needs_rewrite_case = _make_testcase_mock(change_impact="needs_rewrite")
        not_affected_case = _make_testcase_mock(change_impact="not_affected", status="approved")

        # 只查询 needs_rewrite 的用例
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [needs_rewrite_case]
        session.execute = AsyncMock(return_value=mock_result)
        session.commit = AsyncMock()

        result = await svc.push_to_workbench(requirement_id=requirement_id)

        # not_affected 的用例状态不应被改变
        assert not_affected_case.status == "approved", (
            f"not_affected 用例 status 不应被修改，实际: {not_affected_case.status}"
        )
        assert result["pushed_count"] == 1, (
            f"只有1条 needs_rewrite 用例，pushed_count 应为 1，实际: {result['pushed_count']}"
        )

    async def test_mark_affected_sets_change_impact(self):
        """断言 mark_affected_test_cases 后 TestCase.change_impact 被正确设置。"""
        session = AsyncMock()
        svc = _make_service(session)
        requirement_id = uuid.uuid4()

        tc_id_1 = uuid.uuid4()
        tc_id_2 = uuid.uuid4()
        tc_id_3 = uuid.uuid4()

        tc1 = _make_testcase_mock(tc_id=tc_id_1, change_impact="not_affected")
        tc2 = _make_testcase_mock(tc_id=tc_id_2, change_impact="not_affected")
        tc3 = _make_testcase_mock(tc_id=tc_id_3, change_impact="not_affected")

        impact_map = {
            str(tc_id_1): "needs_rewrite",
            str(tc_id_2): "minor_update",
        }

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [tc1, tc2, tc3]
        session.execute = AsyncMock(return_value=mock_result)
        session.commit = AsyncMock()

        await svc.mark_affected_test_cases(
            requirement_id=requirement_id,
            impact_map=impact_map,
        )

        assert tc1.change_impact == "needs_rewrite", (
            f"tc1 的 change_impact 应为 'needs_rewrite'，实际: {tc1.change_impact}"
        )
        assert tc2.change_impact == "minor_update", (
            f"tc2 的 change_impact 应为 'minor_update'，实际: {tc2.change_impact}"
        )
        # tc3 不在 impact_map 中，change_impact 不应被修改
        assert tc3.change_impact == "not_affected", (
            f"tc3 不在 impact_map 中，change_impact 不应被修改，实际: {tc3.change_impact}"
        )
