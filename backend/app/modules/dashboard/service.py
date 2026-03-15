from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Literal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.modules.dashboard.schemas import (
    DashboardActivityItem,
    DashboardIterationOption,
    DashboardPendingItem,
    DashboardStatsResponse,
)
from app.modules.diagnosis.models import DiagnosisReport
from app.modules.products.models import Iteration, Product, Requirement
from app.modules.scene_map.models import SceneMap, TestPoint
from app.modules.testcases.models import TestCase


@dataclass(frozen=True)
class IterationSnapshot:
    id: UUID
    product_id: UUID
    product_name: str
    name: str
    status: str
    start_date: date | None
    end_date: date | None
    created_at: datetime | None


@dataclass(frozen=True)
class IterationMetrics:
    requirement_count: int
    testcase_count: int
    coverage_rate: float
    weekly_cases: int
    pending_diagnosis: int


class DashboardService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_stats(self, iteration_id: UUID | None = None) -> DashboardStatsResponse:
        global_counts = await self._get_global_counts()
        available_iterations = await self._get_iteration_options()
        selected_iteration = self._resolve_selected_iteration(available_iterations, iteration_id)
        previous_iteration = self._resolve_previous_iteration(available_iterations, selected_iteration)

        current_metrics = (
            await self._get_iteration_metrics(selected_iteration.id)
            if selected_iteration
            else self._empty_iteration_metrics()
        )
        previous_metrics = (
            await self._get_iteration_metrics(previous_iteration.id)
            if previous_iteration
            else self._empty_iteration_metrics()
        )

        requirement_delta = (
            current_metrics.requirement_count - previous_metrics.requirement_count if previous_iteration else 0
        )
        testcase_delta = current_metrics.testcase_count - previous_metrics.testcase_count if previous_iteration else 0
        coverage_delta = (
            round(current_metrics.coverage_rate - previous_metrics.coverage_rate, 1) if previous_iteration else 0.0
        )

        return DashboardStatsResponse(
            product_count=global_counts["product_count"],
            iteration_count=global_counts["iteration_count"],
            requirement_count=current_metrics.requirement_count,
            testcase_count=current_metrics.testcase_count,
            coverage_rate=current_metrics.coverage_rate,
            weekly_cases=current_metrics.weekly_cases,
            pending_diagnosis=current_metrics.pending_diagnosis,
            requirement_delta=requirement_delta,
            testcase_delta=testcase_delta,
            coverage_delta=coverage_delta,
            selected_iteration_id=str(selected_iteration.id) if selected_iteration else None,
            selected_iteration_name=selected_iteration.name if selected_iteration else None,
            selected_iteration_status=selected_iteration.status if selected_iteration else None,
            selected_iteration_product_name=selected_iteration.product_name if selected_iteration else None,
            previous_iteration_id=str(previous_iteration.id) if previous_iteration else None,
            previous_iteration_name=previous_iteration.name if previous_iteration else None,
            available_iterations=[
                DashboardIterationOption(
                    id=str(item.id),
                    product_id=str(item.product_id),
                    product_name=item.product_name,
                    name=item.name,
                    status=item.status,
                    start_date=item.start_date,
                    end_date=item.end_date,
                )
                for item in available_iterations
            ],
        )

    async def get_recent_activities(
        self,
        limit: int = 10,
        iteration_id: UUID | None = None,
    ) -> list[DashboardActivityItem]:
        """Get recent activities from various tables."""
        activities: list[DashboardActivityItem] = []

        requirement_conditions: list[ColumnElement[bool]] = [Requirement.deleted_at.is_(None)]
        if iteration_id:
            requirement_conditions.append(Requirement.iteration_id == iteration_id)

        q = (
            select(
                Requirement.id,
                Requirement.req_id,
                Requirement.title,
                Requirement.created_at,
            )
            .where(*requirement_conditions)
            .order_by(Requirement.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(q)
        for req_id, req_code, title, created_at in result.all():
            activities.append(
                DashboardActivityItem(
                    id=f"requirement-{req_id}",
                    time=created_at or self._epoch(),
                    action=f"创建需求 {req_code}",
                    resource="requirement",
                    resource_id=str(req_id),
                    title=title,
                    user="系统",
                )
            )

        testcase_query = select(
            TestCase.id,
            TestCase.case_id,
            TestCase.title,
            TestCase.created_at,
        )

        testcase_conditions: list[ColumnElement[bool]] = [TestCase.deleted_at.is_(None)]
        if iteration_id:
            testcase_query = testcase_query.join(Requirement, TestCase.requirement_id == Requirement.id)
            testcase_conditions.extend(
                [
                    Requirement.deleted_at.is_(None),
                    Requirement.iteration_id == iteration_id,
                ]
            )

        q = testcase_query.where(*testcase_conditions).order_by(TestCase.created_at.desc()).limit(limit)
        result = await self.session.execute(q)
        for case_uuid, case_id, title, created_at in result.all():
            activities.append(
                DashboardActivityItem(
                    id=f"testcase-{case_uuid}",
                    time=created_at or self._epoch(),
                    action=f"生成用例 {case_id}",
                    resource="testcase",
                    resource_id=str(case_uuid),
                    title=title,
                    user="系统",
                )
            )

        activities.sort(key=lambda item: item.time, reverse=True)
        return activities[:limit]

    async def get_pending_items(
        self,
        limit: int = 10,
        iteration_id: UUID | None = None,
    ) -> list[DashboardPendingItem]:
        items: list[DashboardPendingItem] = []

        point_conditions: list[ColumnElement[bool]] = [
            TestPoint.deleted_at.is_(None),
            SceneMap.deleted_at.is_(None),
            Requirement.deleted_at.is_(None),
            Iteration.deleted_at.is_(None),
            Product.deleted_at.is_(None),
            TestPoint.status.in_(("pending", "ai_generated", "supplemented")),
        ]
        if iteration_id:
            point_conditions.append(Requirement.iteration_id == iteration_id)

        point_query = (
            select(
                TestPoint.id,
                TestPoint.title,
                TestPoint.priority,
                TestPoint.created_at,
                Product.name,
            )
            .select_from(TestPoint)
            .join(SceneMap, TestPoint.scene_map_id == SceneMap.id)
            .join(Requirement, SceneMap.requirement_id == Requirement.id)
            .join(Iteration, Requirement.iteration_id == Iteration.id)
            .join(Product, Iteration.product_id == Product.id)
            .where(*point_conditions)
            .order_by(TestPoint.created_at.desc())
            .limit(limit)
        )
        point_rows = await self.session.execute(point_query)
        for point_id, title, priority, created_at, product_name in point_rows.all():
            items.append(
                DashboardPendingItem(
                    id=str(point_id),
                    type="unconfirmed_testpoint",
                    title=title,
                    description="场景地图中仍有待确认测试点",
                    product_name=product_name,
                    priority=self._map_priority(priority),
                    link="/analysis/scene-map",
                    created_at=created_at or self._epoch(),
                )
            )

        case_conditions: list[ColumnElement[bool]] = [
            TestCase.deleted_at.is_(None),
            Requirement.deleted_at.is_(None),
            Iteration.deleted_at.is_(None),
            Product.deleted_at.is_(None),
            TestCase.status.in_(("draft", "review", "rejected")),
        ]
        if iteration_id:
            case_conditions.append(Requirement.iteration_id == iteration_id)

        case_query = (
            select(
                TestCase.id,
                TestCase.title,
                TestCase.priority,
                TestCase.created_at,
                Product.name,
            )
            .select_from(TestCase)
            .join(Requirement, TestCase.requirement_id == Requirement.id)
            .join(Iteration, Requirement.iteration_id == Iteration.id)
            .join(Product, Iteration.product_id == Product.id)
            .where(*case_conditions)
            .order_by(TestCase.created_at.desc())
            .limit(limit)
        )
        case_rows = await self.session.execute(case_query)
        for case_id, title, priority, created_at, product_name in case_rows.all():
            items.append(
                DashboardPendingItem(
                    id=str(case_id),
                    type="pending_review",
                    title=title,
                    description="AI 生成的用例已就绪，等待人工评审确认",
                    product_name=product_name,
                    priority=self._map_priority(priority),
                    link="/testcases",
                    created_at=created_at or self._epoch(),
                )
            )

        diagnosis_conditions: list[ColumnElement[bool]] = [
            DiagnosisReport.deleted_at.is_(None),
            Requirement.deleted_at.is_(None),
            Iteration.deleted_at.is_(None),
            Product.deleted_at.is_(None),
            DiagnosisReport.status == "failed",
        ]
        if iteration_id:
            diagnosis_conditions.append(Requirement.iteration_id == iteration_id)

        diagnosis_query = (
            select(
                DiagnosisReport.id,
                Requirement.title,
                DiagnosisReport.created_at,
                Product.name,
            )
            .select_from(DiagnosisReport)
            .join(Requirement, DiagnosisReport.requirement_id == Requirement.id)
            .join(Iteration, Requirement.iteration_id == Iteration.id)
            .join(Product, Iteration.product_id == Product.id)
            .where(*diagnosis_conditions)
            .order_by(DiagnosisReport.created_at.desc())
            .limit(limit)
        )
        diagnosis_rows = await self.session.execute(diagnosis_query)
        for report_id, title, created_at, product_name in diagnosis_rows.all():
            items.append(
                DashboardPendingItem(
                    id=str(report_id),
                    type="failed_diagnosis",
                    title=title,
                    description="分析流程执行失败，建议重新触发并检查输入",
                    product_name=product_name,
                    priority="high",
                    link="/analysis/diagnosis",
                    created_at=created_at or self._epoch(),
                )
            )

        items.sort(key=lambda item: item.created_at, reverse=True)
        return items[:limit]

    async def get_products_overview(self) -> list[dict]:
        """Get overview of all products with stats."""
        q = select(Product).where(Product.deleted_at.is_(None))
        result = await self.session.execute(q)
        products = result.scalars().all()

        overview = []
        for p in products:
            iter_q = select(func.count()).where(
                Iteration.product_id == p.id,
                Iteration.deleted_at.is_(None),
            )
            iter_count = (await self.session.execute(iter_q)).scalar() or 0

            req_q = (
                select(func.count())
                .select_from(Requirement)
                .join(Iteration, Requirement.iteration_id == Iteration.id)
                .where(
                    Iteration.product_id == p.id,
                    Requirement.deleted_at.is_(None),
                )
            )
            req_count = (await self.session.execute(req_q)).scalar() or 0

            tc_q = (
                select(func.count())
                .select_from(TestCase)
                .join(Requirement, TestCase.requirement_id == Requirement.id)
                .join(Iteration, Requirement.iteration_id == Iteration.id)
                .where(
                    Iteration.product_id == p.id,
                    TestCase.deleted_at.is_(None),
                )
            )
            tc_count = (await self.session.execute(tc_q)).scalar() or 0

            overview.append(
                {
                    "id": str(p.id),
                    "name": p.name,
                    "slug": p.slug,
                    "description": p.description,
                    "iteration_count": iter_count,
                    "requirement_count": req_count,
                    "testcase_count": tc_count,
                    "status": "active",
                }
            )

        return overview

    async def _count(self, model, *conditions) -> int:  # type: ignore[type-arg]
        q = select(func.count()).where(model.deleted_at.is_(None), *conditions)
        result = await self.session.execute(q)
        return result.scalar() or 0

    async def get_quality_stats(self, iteration_id: UUID | None = None) -> dict:
        """Get quality analysis statistics for the dashboard."""
        total_q = select(func.count()).select_from(TestCase).where(TestCase.deleted_at.is_(None))
        if iteration_id:
            total_q = total_q.join(Requirement, TestCase.requirement_id == Requirement.id).where(
                Requirement.deleted_at.is_(None),
                Requirement.iteration_id == iteration_id,
            )
        total = (await self.session.execute(total_q)).scalar() or 0

        priority_q = (
            select(TestCase.priority, func.count().label("count"))
            .select_from(TestCase)
            .where(TestCase.deleted_at.is_(None))
            .group_by(TestCase.priority)
        )
        if iteration_id:
            priority_q = priority_q.join(Requirement, TestCase.requirement_id == Requirement.id).where(
                Requirement.deleted_at.is_(None),
                Requirement.iteration_id == iteration_id,
            )
        priority_rows = await self.session.execute(priority_q)
        by_priority = {str(priority or "unknown"): count for priority, count in priority_rows.all()}

        type_q = (
            select(TestCase.case_type, func.count().label("count"))
            .select_from(TestCase)
            .where(TestCase.deleted_at.is_(None))
            .group_by(TestCase.case_type)
        )
        if iteration_id:
            type_q = type_q.join(Requirement, TestCase.requirement_id == Requirement.id).where(
                Requirement.deleted_at.is_(None),
                Requirement.iteration_id == iteration_id,
            )
        type_rows = await self.session.execute(type_q)
        by_type = {str(case_type or "unknown"): count for case_type, count in type_rows.all()}

        status_q = (
            select(TestCase.status, func.count().label("count"))
            .select_from(TestCase)
            .where(TestCase.deleted_at.is_(None))
            .group_by(TestCase.status)
        )
        if iteration_id:
            status_q = status_q.join(Requirement, TestCase.requirement_id == Requirement.id).where(
                Requirement.deleted_at.is_(None),
                Requirement.iteration_id == iteration_id,
            )
        status_rows = await self.session.execute(status_q)
        by_status = {str(status or "unknown"): count for status, count in status_rows.all()}

        source_q = (
            select(TestCase.source, func.count().label("count"))
            .select_from(TestCase)
            .where(TestCase.deleted_at.is_(None))
            .group_by(TestCase.source)
        )
        if iteration_id:
            source_q = source_q.join(Requirement, TestCase.requirement_id == Requirement.id).where(
                Requirement.deleted_at.is_(None),
                Requirement.iteration_id == iteration_id,
            )
        source_rows = await self.session.execute(source_q)
        by_source = {str(source or "unknown"): count for source, count in source_rows.all()}

        avg_q = (
            select(func.avg(TestCase.ai_score))
            .select_from(TestCase)
            .where(
                TestCase.deleted_at.is_(None),
                TestCase.ai_score.is_not(None),
            )
        )
        if iteration_id:
            avg_q = avg_q.join(Requirement, TestCase.requirement_id == Requirement.id).where(
                Requirement.deleted_at.is_(None),
                Requirement.iteration_id == iteration_id,
            )
        avg_score = (await self.session.execute(avg_q)).scalar()

        req_count = (
            await self._count(Requirement, Requirement.iteration_id == iteration_id)
            if iteration_id
            else await self._count(Requirement)
        )
        covered_q = (
            select(func.count(func.distinct(TestCase.requirement_id)))
            .select_from(TestCase)
            .join(Requirement, TestCase.requirement_id == Requirement.id)
            .where(
                TestCase.deleted_at.is_(None),
                Requirement.deleted_at.is_(None),
            )
        )
        if iteration_id:
            covered_q = covered_q.where(Requirement.iteration_id == iteration_id)
        covered = (await self.session.execute(covered_q)).scalar() or 0
        coverage = round(covered / req_count * 100, 1) if req_count > 0 else 0

        return {
            "total_cases": total,
            "by_priority": by_priority,
            "by_type": by_type,
            "by_status": by_status,
            "by_source": by_source,
            "avg_ai_score": round(avg_score, 2) if avg_score else None,
            "coverage_rate": coverage,
        }

    async def _get_global_counts(self) -> dict[str, int]:
        return {
            "product_count": await self._count(Product),
            "iteration_count": await self._count(Iteration, Iteration.status == "active"),
        }

    async def _get_iteration_options(self) -> list[IterationSnapshot]:
        query = (
            select(
                Iteration.id,
                Iteration.product_id,
                Product.name,
                Iteration.name,
                Iteration.status,
                Iteration.start_date,
                Iteration.end_date,
                Iteration.created_at,
            )
            .select_from(Iteration)
            .join(Product, Iteration.product_id == Product.id)
            .where(
                Iteration.deleted_at.is_(None),
                Product.deleted_at.is_(None),
            )
        )
        result = await self.session.execute(query)
        iterations = [
            IterationSnapshot(
                id=iteration_id,
                product_id=product_id,
                product_name=product_name,
                name=name,
                status=status,
                start_date=start_date,
                end_date=end_date,
                created_at=created_at,
            )
            for iteration_id, product_id, product_name, name, status, start_date, end_date, created_at in result.all()
        ]
        iterations.sort(key=self._iteration_sort_key, reverse=True)
        return iterations

    def _resolve_selected_iteration(
        self,
        iterations: list[IterationSnapshot],
        iteration_id: UUID | None,
    ) -> IterationSnapshot | None:
        if iteration_id:
            for item in iterations:
                if item.id == iteration_id:
                    return item
        return iterations[0] if iterations else None

    def _resolve_previous_iteration(
        self,
        iterations: list[IterationSnapshot],
        selected_iteration: IterationSnapshot | None,
    ) -> IterationSnapshot | None:
        if not selected_iteration:
            return None

        product_iterations = [item for item in iterations if item.product_id == selected_iteration.product_id]
        for index, item in enumerate(product_iterations):
            if item.id == selected_iteration.id and index + 1 < len(product_iterations):
                return product_iterations[index + 1]
        return None

    async def _get_iteration_metrics(self, iteration_id: UUID) -> IterationMetrics:
        requirement_count = await self._count(Requirement, Requirement.iteration_id == iteration_id)

        testcase_query = (
            select(func.count())
            .select_from(TestCase)
            .join(Requirement, TestCase.requirement_id == Requirement.id)
            .where(
                TestCase.deleted_at.is_(None),
                Requirement.deleted_at.is_(None),
                Requirement.iteration_id == iteration_id,
            )
        )
        testcase_count = (await self.session.execute(testcase_query)).scalar() or 0

        weekly_cases_query = testcase_query.where(TestCase.created_at >= datetime.now(UTC) - timedelta(days=7))
        weekly_cases = (await self.session.execute(weekly_cases_query)).scalar() or 0

        pending_diagnosis_query = (
            select(func.count())
            .select_from(DiagnosisReport)
            .join(Requirement, DiagnosisReport.requirement_id == Requirement.id)
            .where(
                DiagnosisReport.deleted_at.is_(None),
                Requirement.deleted_at.is_(None),
                Requirement.iteration_id == iteration_id,
                DiagnosisReport.status.in_(("failed", "running")),
            )
        )
        pending_diagnosis = (await self.session.execute(pending_diagnosis_query)).scalar() or 0

        covered_query = (
            select(func.count(func.distinct(TestCase.requirement_id)))
            .select_from(TestCase)
            .join(Requirement, TestCase.requirement_id == Requirement.id)
            .where(
                TestCase.deleted_at.is_(None),
                Requirement.deleted_at.is_(None),
                Requirement.iteration_id == iteration_id,
            )
        )
        covered_requirements = (await self.session.execute(covered_query)).scalar() or 0
        coverage_rate = round(covered_requirements / requirement_count * 100, 1) if requirement_count else 0.0

        return IterationMetrics(
            requirement_count=requirement_count,
            testcase_count=testcase_count,
            coverage_rate=coverage_rate,
            weekly_cases=weekly_cases,
            pending_diagnosis=pending_diagnosis,
        )

    def _empty_iteration_metrics(self) -> IterationMetrics:
        return IterationMetrics(
            requirement_count=0,
            testcase_count=0,
            coverage_rate=0.0,
            weekly_cases=0,
            pending_diagnosis=0,
        )

    def _iteration_sort_key(self, item: IterationSnapshot) -> tuple[int, int, float]:
        chronology = item.end_date or item.start_date
        chronology_score = chronology.toordinal() if chronology else 0
        created_score = item.created_at.timestamp() if item.created_at else 0.0
        status_score = 1 if item.status == "active" else 0
        return (status_score, chronology_score, created_score)

    def _map_priority(self, priority: str | None) -> Literal["high", "medium", "low"]:
        if priority == "P0":
            return "high"
        if priority == "P1":
            return "medium"
        return "low"

    def _epoch(self) -> datetime:
        return datetime.fromtimestamp(0, tz=UTC)
