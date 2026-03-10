"""add clean_status quality_score original_raw to test_cases

Revision ID: a9099d7b99cf
Revises: c41e7d5f6a01
Create Date: 2026-03-11 03:12:01.672251

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a9099d7b99cf"
down_revision: str | Sequence[str] | None = "c41e7d5f6a01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add data cleaning fields to test_cases."""
    op.add_column("test_cases", sa.Column("clean_status", sa.String(length=20), nullable=False, server_default="raw"))
    op.add_column("test_cases", sa.Column("quality_score", sa.Float(), nullable=True))
    op.add_column("test_cases", sa.Column("original_raw", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    """Remove data cleaning fields from test_cases."""
    op.drop_column("test_cases", "original_raw")
    op.drop_column("test_cases", "quality_score")
    op.drop_column("test_cases", "clean_status")
