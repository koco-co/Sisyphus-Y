"""create knowledge documents table

Revision ID: 14d8578f0c07
Revises: f817de7fa899
Create Date: 2026-03-10 10:01:26.968226

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '14d8578f0c07'
down_revision: str | Sequence[str] | None = 'f817de7fa899'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "knowledge_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("file_name", sa.String(length=500), nullable=False),
        sa.Column("doc_type", sa.String(length=50), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("content_ast", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "tags",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("source", sa.String(length=200), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "vector_status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("hit_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_knowledge_documents_deleted_at",
        "knowledge_documents",
        ["deleted_at"],
        unique=False,
    )
    op.create_index(
        "ix_knowledge_documents_file_name",
        "knowledge_documents",
        ["file_name"],
        unique=False,
    )
    op.create_index(
        "ix_knowledge_documents_vector_status",
        "knowledge_documents",
        ["vector_status"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_knowledge_documents_vector_status", table_name="knowledge_documents")
    op.drop_index("ix_knowledge_documents_file_name", table_name="knowledge_documents")
    op.drop_index("ix_knowledge_documents_deleted_at", table_name="knowledge_documents")
    op.drop_table("knowledge_documents")
