import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ExecutionResultCreate(BaseModel):
    test_case_id: uuid.UUID
    status: str  # passed/failed/blocked/skipped
    executor: str | None = None
    environment: str | None = None
    duration_seconds: float | None = None
    failure_reason: str | None = None
    notes: str | None = None


class ExecutionResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    test_case_id: uuid.UUID
    status: str
    executor: str | None = None
    environment: str | None = None
    duration_seconds: float | None = None
    failure_reason: str | None = None
    notes: str | None = None
    created_at: datetime | None = None


class BatchExecutionRequest(BaseModel):
    results: list[ExecutionResultCreate]
