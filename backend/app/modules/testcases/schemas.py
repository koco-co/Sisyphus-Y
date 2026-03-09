import uuid
from typing import Literal

from app.shared.base_schema import BaseResponse, BaseSchema


class TestCaseStepSchema(BaseSchema):
    step_num: int
    action: str
    expected_result: str


class TestCaseStepResponse(BaseResponse):
    test_case_id: uuid.UUID
    step_num: int
    action: str
    expected_result: str


class TestCaseCreate(BaseSchema):
    requirement_id: uuid.UUID
    test_point_id: uuid.UUID | None = None
    case_id: str
    title: str
    priority: Literal["P0", "P1", "P2"] = "P1"
    case_type: Literal["normal", "exception", "boundary", "concurrent"] = "normal"
    precondition: str | None = None
    steps: list[TestCaseStepSchema] = []


class TestCaseUpdate(BaseSchema):
    title: str | None = None
    priority: Literal["P0", "P1", "P2"] | None = None
    case_type: str | None = None
    status: str | None = None
    precondition: str | None = None
    steps: list[TestCaseStepSchema] | None = None


class TestCaseResponse(BaseResponse):
    requirement_id: uuid.UUID
    test_point_id: uuid.UUID | None
    case_id: str
    title: str
    priority: str
    case_type: str
    status: str
    source: str
    ai_score: float | None
    precondition: str | None
    version: int


class TestCaseListQuery(BaseSchema):
    requirement_id: uuid.UUID | None = None
    priority: str | None = None
    case_type: str | None = None
    status: str | None = None
    page: int = 1
    page_size: int = 20
