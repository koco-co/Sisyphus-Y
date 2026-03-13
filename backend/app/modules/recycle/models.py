import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import BaseModel


def _default_expires_at() -> datetime:
    return datetime.now(UTC) + timedelta(days=30)


class RecycleItem(BaseModel):
    """Recycle bin entry tracking soft-deleted objects with 30-day expiry."""

    __tablename__ = "recycle_items"

    object_type: Mapped[str] = mapped_column(String(50), index=True)
    object_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    object_name: Mapped[str] = mapped_column(String(300))
    object_snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_default_expires_at,
    )
