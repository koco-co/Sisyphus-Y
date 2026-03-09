import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import BaseModel


class GenerationSession(BaseModel):
    __tablename__ = "generation_sessions"

    requirement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("requirements.id"), index=True
    )
    mode: Mapped[str] = mapped_column(String(30), default="test_point_driven")
    status: Mapped[str] = mapped_column(String(20), default="active")
    model_used: Mapped[str] = mapped_column(String(50), default="gpt-4o")


class GenerationMessage(BaseModel):
    __tablename__ = "generation_messages"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("generation_sessions.id"), index=True
    )
    role: Mapped[str] = mapped_column(String(10))
    content: Mapped[str] = mapped_column(Text)
    thinking_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_count: Mapped[int] = mapped_column(Integer, default=0)
