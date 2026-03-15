"""B-M19-04 — Dashboard iteration scope and delta tests."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from app.modules.dashboard.service import DashboardService, IterationMetrics, IterationSnapshot


def _make_iteration(
    *,
    iteration_id: uuid.UUID,
    product_id: uuid.UUID,
    product_name: str,
    name: str,
    status: str,
) -> IterationSnapshot:
    return IterationSnapshot(
        id=iteration_id,
        product_id=product_id,
        product_name=product_name,
        name=name,
        status=status,
        start_date=None,
        end_date=None,
        created_at=datetime.now(UTC),
    )


class TestDashboardStatsService:
    async def test_get_stats_builds_iteration_delta_response(self):
        """指定 iteration_id 时应返回当前迭代指标、上一迭代对比与可选迭代列表。"""
        session = AsyncMock()
        service = DashboardService(session)
        product_id = uuid.uuid4()
        selected_iteration_id = uuid.uuid4()
        previous_iteration_id = uuid.uuid4()

        available_iterations = [
            _make_iteration(
                iteration_id=selected_iteration_id,
                product_id=product_id,
                product_name="订单中心",
                name="Sprint 3",
                status="active",
            ),
            _make_iteration(
                iteration_id=previous_iteration_id,
                product_id=product_id,
                product_name="订单中心",
                name="Sprint 2",
                status="completed",
            ),
        ]

        current_metrics = IterationMetrics(
            requirement_count=42,
            testcase_count=1247,
            coverage_rate=78.3,
            weekly_cases=203,
            pending_diagnosis=4,
        )
        previous_metrics = IterationMetrics(
            requirement_count=34,
            testcase_count=1044,
            coverage_rate=80.4,
            weekly_cases=155,
            pending_diagnosis=6,
        )

        with (
            patch.object(
                service,
                "_get_global_counts",
                new=AsyncMock(return_value={"product_count": 6, "iteration_count": 12}),
            ),
            patch.object(
                service,
                "_get_iteration_options",
                new=AsyncMock(return_value=available_iterations),
            ),
            patch.object(
                service,
                "_get_iteration_metrics",
                new=AsyncMock(side_effect=[current_metrics, previous_metrics]),
            ),
        ):
            result = await service.get_stats(selected_iteration_id)

        assert result.selected_iteration_id == str(selected_iteration_id)
        assert result.selected_iteration_name == "Sprint 3"
        assert result.selected_iteration_product_name == "订单中心"
        assert result.previous_iteration_id == str(previous_iteration_id)
        assert result.previous_iteration_name == "Sprint 2"
        assert result.requirement_count == 42
        assert result.testcase_count == 1247
        assert result.requirement_delta == 8
        assert result.testcase_delta == 203
        assert result.coverage_delta == -2.1
        assert [item.id for item in result.available_iterations] == [
            str(selected_iteration_id),
            str(previous_iteration_id),
        ]

    async def test_get_stats_returns_empty_iteration_scope_when_none_exist(self):
        """没有任何迭代时应返回空选择器与 0 值统计。"""
        session = AsyncMock()
        service = DashboardService(session)

        with (
            patch.object(
                service,
                "_get_global_counts",
                new=AsyncMock(return_value={"product_count": 0, "iteration_count": 0}),
            ),
            patch.object(service, "_get_iteration_options", new=AsyncMock(return_value=[])),
        ):
            result = await service.get_stats()

        assert result.selected_iteration_id is None
        assert result.previous_iteration_id is None
        assert result.requirement_count == 0
        assert result.testcase_count == 0
        assert result.coverage_rate == 0
        assert result.requirement_delta == 0
        assert result.available_iterations == []

    async def test_get_pending_items_routes_analysis_work_to_analysis_hub(self):
        """待处理事项里的分析/测试点入口应优先收敛到 /analysis 域。"""

        class _Rows:
            def __init__(self, rows):
                self._rows = rows

            def all(self):
                return self._rows

        session = AsyncMock()
        service = DashboardService(session)
        now = datetime.now(UTC)
        point_id = uuid.uuid4()
        case_id = uuid.uuid4()
        report_id = uuid.uuid4()

        session.execute = AsyncMock(
            side_effect=[
                _Rows([(point_id, "待确认测试点", "P1", now, "订单中心")]),
                _Rows([(case_id, "待审核用例", "P1", now, "订单中心")]),
                _Rows([(report_id, "失败分析", now, "订单中心")]),
            ]
        )

        items = await service.get_pending_items()

        assert any(
            item.type == "unconfirmed_testpoint" and item.link == "/analysis/scene-map" for item in items
        )
        assert any(item.type == "pending_review" and item.link == "/testcases" for item in items)
        assert any(
            item.type == "failed_diagnosis" and item.link == "/analysis/diagnosis" for item in items
        )


class TestDashboardStatsEndpoint:
    async def test_stats_endpoint_accepts_iteration_query(self):
        """GET /api/dashboard/stats 应把 iteration_id 透传给服务层。"""
        iteration_id = uuid.uuid4()
        mock_service_instance = AsyncMock()
        mock_service_instance.get_stats = AsyncMock(
            return_value={
                "product_count": 6,
                "iteration_count": 12,
                "requirement_count": 42,
                "testcase_count": 1247,
                "coverage_rate": 78.3,
                "weekly_cases": 203,
                "pending_diagnosis": 4,
                "requirement_delta": 8,
                "testcase_delta": 203,
                "coverage_delta": -2.1,
                "selected_iteration_id": str(iteration_id),
                "selected_iteration_name": "Sprint 3",
                "selected_iteration_status": "active",
                "selected_iteration_product_name": "订单中心",
                "previous_iteration_id": None,
                "previous_iteration_name": None,
                "available_iterations": [
                    {
                        "id": str(iteration_id),
                        "product_id": str(uuid.uuid4()),
                        "product_name": "订单中心",
                        "name": "Sprint 3",
                        "status": "active",
                        "start_date": None,
                        "end_date": None,
                    }
                ],
            }
        )

        with patch("app.modules.dashboard.router.DashboardService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.get(f"/api/dashboard/stats?iteration_id={iteration_id}")

            app.dependency_overrides.clear()

        assert response.status_code == 200
        assert response.json()["selected_iteration_id"] == str(iteration_id)
        mock_service_instance.get_stats.assert_awaited_once_with(iteration_id)
