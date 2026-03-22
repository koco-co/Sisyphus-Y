import uuid

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import BaseModel


class Product(BaseModel):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(100))
    slug: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)


class Iteration(BaseModel):
    __tablename__ = "iterations"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    name: Mapped[str] = mapped_column(String(100))
    start_date: Mapped[str | None] = mapped_column(Date)
    end_date: Mapped[str | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="active")


class RequirementFolder(BaseModel):
    """Hierarchical folder for organizing requirements within an iteration."""

    __tablename__ = "requirement_folders"

    iteration_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("iterations.id"), index=True
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("requirement_folders.id"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)


class Requirement(BaseModel):
    __tablename__ = "requirements"

    iteration_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("iterations.id"))
    folder_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("requirement_folders.id"),
        nullable=True,
        index=True,
    )
    req_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    title: Mapped[str] = mapped_column(Text)
    content_ast: Mapped[dict] = mapped_column(JSONB, default=dict)
    frontmatter: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    version: Mapped[int] = mapped_column(Integer, default=1)


class RequirementVersion(BaseModel):
    __tablename__ = "requirement_versions"

    requirement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("requirements.id"))
    version: Mapped[int] = mapped_column(Integer)
    content_ast: Mapped[dict] = mapped_column(JSONB)
    change_summary: Mapped[str | None] = mapped_column(Text)
