import uuid

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import BaseModel


class ExecutionResult(BaseModel):
    __tablename__ = "execution_results"

    test_case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("test_cases.id"), index=True)
    status: Mapped[str] = mapped_column(String(20))  # passed/failed/blocked/skipped
    executor: Mapped[str | None] = mapped_column(String(100), nullable=True)
    environment: Mapped[str | None] = mapped_column(String(100), nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
