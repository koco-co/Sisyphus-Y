from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from app.shared.base_schema import BaseSchema


class DashboardIterationOption(BaseSchema):
    id: str
    product_id: str
    product_name: str
    name: str
    status: str
    start_date: date | None = None
    end_date: date | None = None


class DashboardStatsResponse(BaseSchema):
    product_count: int
    iteration_count: int
    requirement_count: int
    testcase_count: int
    coverage_rate: float
    weekly_cases: int
    pending_diagnosis: int
    requirement_delta: int = 0
    testcase_delta: int = 0
    coverage_delta: float = 0
    selected_iteration_id: str | None = None
    selected_iteration_name: str | None = None
    selected_iteration_status: str | None = None
    selected_iteration_product_name: str | None = None
    previous_iteration_id: str | None = None
    previous_iteration_name: str | None = None
    available_iterations: list[DashboardIterationOption] = []


class DashboardActivityItem(BaseSchema):
    id: str
    time: datetime
    action: str
    resource: str
    resource_id: str
    title: str
    user: str


class DashboardPendingItem(BaseSchema):
    id: str
    type: Literal["unconfirmed_testpoint", "pending_review", "failed_diagnosis", "low_coverage"]
    title: str
    description: str
    product_name: str
    priority: Literal["high", "medium", "low"]
    link: str
    created_at: datetime


class QualityStatsResponse(BaseSchema):
    total_cases: int
    by_priority: dict[str, int]
    by_type: dict[str, int]
    by_status: dict[str, int]
    by_source: dict[str, int]
    avg_ai_score: float | None
    coverage_rate: float
