import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DiffResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    requirement_id: uuid.UUID
    version_from: int
    version_to: int
    text_diff: dict
    semantic_impact: dict | None = None
    impact_level: str
    affected_test_points: dict | None = None
    affected_test_cases: dict | None = None
    summary: str | None = None
    created_at: datetime | None = None


class DiffRequest(BaseModel):
    version_from: int
    version_to: int
