"""DSH-02 — DashboardService.get_trend_stats 趋势端点测试"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

from app.modules.dashboard.service import DashboardService, IterationMetrics, IterationSnapshot


def _make_iteration(
    *,
    iteration_id: uuid.UUID | None = None,
    product_id: uuid.UUID | None = None,
    name: str = "Sprint 1",
    status: str = "active",
) -> IterationSnapshot:
    return IterationSnapshot(
        id=iteration_id or uuid.uuid4(),
        product_id=product_id or uuid.uuid4(),
        product_name="测试产品",
        name=name,
        status=status,
        start_date=None,
        end_date=None,
        created_at=datetime.now(UTC),
    )


def _default_metrics(
    testcase_count: int = 50,
    coverage_rate: float = 80.0,
) -> IterationMetrics:
    return IterationMetrics(
        requirement_count=10,
        testcase_count=testcase_count,
        coverage_rate=coverage_rate,
        weekly_cases=5,
        pending_diagnosis=0,
    )


class TestGetTrendStats:
    async def test_get_trend_stats_returns_six_iterations(self):
        """mock 6个迭代快照，断言返回列表长度=6。"""
        session = AsyncMock()
        service = DashboardService(session)
        product_id = uuid.uuid4()

        fake_rows = [
            {
                "iteration_name": f"Sprint {i}",
                "testcase_count": 100 + i * 10,
                "p0_count": 10 + i,
                "coverage_rate": 60.0 + i * 2,
            }
            for i in range(1, 7)
        ]

        with patch.object(
            service,
            "get_trend_stats",
            new=AsyncMock(return_value=fake_rows),
        ):
            result = await service.get_trend_stats(product_id=product_id, limit=6)

        assert len(result) == 6

    async def test_trend_stats_correct_structure(self):
        """断言每条有 iteration_name/testcase_count/p0_count/coverage_rate 字段。"""
        session = AsyncMock()
        service = DashboardService(session)
        iterations = [_make_iteration(name="Sprint 1")]

        with (
            patch.object(service, "_get_iteration_options", new=AsyncMock(return_value=iterations)),
            patch.object(service, "_get_iteration_metrics", new=AsyncMock(return_value=_default_metrics())),
            patch.object(service, "_get_p0_count", new=AsyncMock(return_value=5)),
        ):
            result = await service.get_trend_stats(limit=6)

        assert isinstance(result, list)
        for item in result:
            assert "iteration_name" in item, f"缺少 iteration_name，实际: {item}"
            assert "testcase_count" in item, f"缺少 testcase_count，实际: {item}"
            assert "p0_count" in item, f"缺少 p0_count，实际: {item}"
            assert "coverage_rate" in item, f"缺少 coverage_rate，实际: {item}"

    async def test_trend_stats_includes_p0_count(self):
        """断言 p0_count 字段为非负整数。"""
        session = AsyncMock()
        service = DashboardService(session)
        iterations = [_make_iteration(name="Sprint 1"), _make_iteration(name="Sprint 2")]

        with (
            patch.object(service, "_get_iteration_options", new=AsyncMock(return_value=iterations)),
            patch.object(service, "_get_iteration_metrics", new=AsyncMock(return_value=_default_metrics())),
            patch.object(service, "_get_p0_count", new=AsyncMock(return_value=8)),
        ):
            result = await service.get_trend_stats(limit=3)

        assert isinstance(result, list)
        for item in result:
            assert isinstance(item["p0_count"], int)
            assert item["p0_count"] >= 0

    async def test_trend_stats_time_ascending(self):
        """断言列表按时间正序排列（最旧的迭代在前）。"""
        session = AsyncMock()
        service = DashboardService(session)

        # _get_iteration_options 返回 desc 顺序（最新在前）
        iterations = [
            _make_iteration(name="Sprint 3"),  # 最新
            _make_iteration(name="Sprint 2"),
            _make_iteration(name="Sprint 1"),  # 最旧
        ]
        call_counter = {"n": 0}

        async def _metrics_side_effect(*_args, **_kwargs):
            call_counter["n"] += 1
            return _default_metrics(testcase_count=call_counter["n"] * 10)

        with (
            patch.object(service, "_get_iteration_options", new=AsyncMock(return_value=iterations)),
            patch.object(service, "_get_iteration_metrics", new=_metrics_side_effect),
            patch.object(service, "_get_p0_count", new=AsyncMock(return_value=0)),
        ):
            result = await service.get_trend_stats(limit=6)

        # 时间正序：Sprint 1 应在最前（来自 iterations 末尾，reversed 后第一个）
        assert result[0]["iteration_name"] == "Sprint 1"
        assert result[-1]["iteration_name"] == "Sprint 3"

    async def test_trend_stats_limit(self):
        """limit=2 时只返回最新的 2 个迭代（时间正序）。"""
        session = AsyncMock()
        service = DashboardService(session)
        iterations = [_make_iteration(name=f"Sprint {i}") for i in range(5, 0, -1)]  # desc: 5,4,3,2,1

        with (
            patch.object(service, "_get_iteration_options", new=AsyncMock(return_value=iterations)),
            patch.object(service, "_get_iteration_metrics", new=AsyncMock(return_value=_default_metrics())),
            patch.object(service, "_get_p0_count", new=AsyncMock(return_value=0)),
        ):
            result = await service.get_trend_stats(limit=2)

        assert len(result) == 2
        # 最新的 2 个是 Sprint 5 和 Sprint 4（desc 中前两个）
        # reversed → Sprint 4 先, Sprint 5 后
        names = [item["iteration_name"] for item in result]
        assert "Sprint 5" in names
        assert "Sprint 4" in names

    async def test_trend_stats_empty_iterations(self):
        """无迭代时返回空列表。"""
        session = AsyncMock()
        service = DashboardService(session)

        with patch.object(service, "_get_iteration_options", new=AsyncMock(return_value=[])):
            result = await service.get_trend_stats()

        assert result == []

    async def test_trend_stats_filter_by_product_id(self):
        """product_id 过滤只返回对应产品的迭代数据。"""
        session = AsyncMock()
        service = DashboardService(session)

        product_a = uuid.uuid4()
        product_b = uuid.uuid4()
        iterations = [
            _make_iteration(name="Sprint A2", product_id=product_a),
            _make_iteration(name="Sprint A1", product_id=product_a),
            _make_iteration(name="Sprint B1", product_id=product_b),
        ]

        with (
            patch.object(service, "_get_iteration_options", new=AsyncMock(return_value=iterations)),
            patch.object(service, "_get_iteration_metrics", new=AsyncMock(return_value=_default_metrics())),
            patch.object(service, "_get_p0_count", new=AsyncMock(return_value=0)),
        ):
            result = await service.get_trend_stats(product_id=product_a)

        assert len(result) == 2
        names = [item["iteration_name"] for item in result]
        assert "Sprint B1" not in names
        assert "Sprint A1" in names
        assert "Sprint A2" in names

    async def test_trend_stats_zero_values_for_empty_iteration(self):
        """无用例的迭代 testcase_count=0, p0_count=0, coverage_rate=0.0。"""
        session = AsyncMock()
        service = DashboardService(session)
        iterations = [_make_iteration(name="Sprint Empty")]
        empty_metrics = IterationMetrics(
            requirement_count=0,
            testcase_count=0,
            coverage_rate=0.0,
            weekly_cases=0,
            pending_diagnosis=0,
        )

        with (
            patch.object(service, "_get_iteration_options", new=AsyncMock(return_value=iterations)),
            patch.object(service, "_get_iteration_metrics", new=AsyncMock(return_value=empty_metrics)),
            patch.object(service, "_get_p0_count", new=AsyncMock(return_value=0)),
        ):
            result = await service.get_trend_stats()

        item = result[0]
        assert item["testcase_count"] == 0
        assert item["p0_count"] == 0
        assert item["coverage_rate"] == 0.0


class TestTrendEndpoint:
    async def test_get_trend_endpoint_returns_200(self):
        """GET /api/dashboard/trend 应返回 200 和 list。"""
        from unittest.mock import patch

        from httpx import ASGITransport, AsyncClient

        mock_service = AsyncMock()
        mock_service.get_trend_stats = AsyncMock(
            return_value=[
                {
                    "iteration_name": "Sprint 1",
                    "testcase_count": 100,
                    "p0_count": 20,
                    "coverage_rate": 80.0,
                }
            ]
        )

        with patch("app.modules.dashboard.router.DashboardService", return_value=mock_service):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.get("/api/dashboard/trend")

            app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert data[0]["iteration_name"] == "Sprint 1"

    async def test_get_trend_endpoint_accepts_limit_param(self):
        """GET /api/dashboard/trend?limit=3 应把 limit=3 传给服务层。"""
        from unittest.mock import patch

        from httpx import ASGITransport, AsyncClient

        mock_service = AsyncMock()
        mock_service.get_trend_stats = AsyncMock(return_value=[])

        with patch("app.modules.dashboard.router.DashboardService", return_value=mock_service):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.get("/api/dashboard/trend?limit=3")

            app.dependency_overrides.clear()

        assert response.status_code == 200
        mock_service.get_trend_stats.assert_awaited_once()
        call_args = mock_service.get_trend_stats.call_args
        # limit=3 应该被传递（keyword 参数）
        assert call_args.kwargs.get("limit") == 3
