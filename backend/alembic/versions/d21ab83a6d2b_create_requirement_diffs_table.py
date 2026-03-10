"""create requirement diffs table

Revision ID: d21ab83a6d2b
Revises: 14d8578f0c07
Create Date: 2026-03-10 10:24:34.093368

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d21ab83a6d2b"
down_revision: str | Sequence[str] | None = "14d8578f0c07"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "requirement_diffs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requirement_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_from", sa.Integer(), nullable=False),
        sa.Column("version_to", sa.Integer(), nullable=False),
        sa.Column(
            "text_diff",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("semantic_impact", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "impact_level",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'unknown'"),
        ),
        sa.Column("affected_test_points", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("affected_test_cases", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_requirement_diffs_requirement_id",
        "requirement_diffs",
        ["requirement_id"],
        unique=False,
    )
    op.create_index(
        "ix_requirement_diffs_deleted_at",
        "requirement_diffs",
        ["deleted_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_requirement_diffs_deleted_at", table_name="requirement_diffs")
    op.drop_index("ix_requirement_diffs_requirement_id", table_name="requirement_diffs")
    op.drop_table("requirement_diffs")
