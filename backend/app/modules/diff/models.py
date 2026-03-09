import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import BaseModel


class RequirementDiff(BaseModel):
    __tablename__ = "requirement_diffs"

    requirement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("requirements.id"), index=True)
    version_from: Mapped[int] = mapped_column(Integer)
    version_to: Mapped[int] = mapped_column(Integer)
    text_diff: Mapped[dict] = mapped_column(JSONB, default=dict)
    semantic_impact: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    impact_level: Mapped[str] = mapped_column(String(20), default="unknown")
    affected_test_points: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    affected_test_cases: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
