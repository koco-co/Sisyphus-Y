"""align notifications schema with runtime model

Revision ID: 9b2f6a4d1c77
Revises: 7a5e7c9b2d11
Create Date: 2026-03-10 12:47:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9b2f6a4d1c77"
down_revision: str | Sequence[str] | None = "7a5e7c9b2d11"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "notifications",
        "type",
        new_column_name="notification_type",
        existing_type=sa.String(length=30),
        existing_nullable=False,
    )
    op.alter_column(
        "notifications",
        "ref_type",
        new_column_name="related_type",
        existing_type=sa.String(length=50),
        existing_nullable=True,
    )
    op.alter_column(
        "notifications",
        "ref_id",
        new_column_name="related_id",
        existing_type=sa.UUID(),
        existing_nullable=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "notifications",
        "related_id",
        new_column_name="ref_id",
        existing_type=sa.UUID(),
        existing_nullable=True,
    )
    op.alter_column(
        "notifications",
        "related_type",
        new_column_name="ref_type",
        existing_type=sa.String(length=50),
        existing_nullable=True,
    )
    op.alter_column(
        "notifications",
        "notification_type",
        new_column_name="type",
        existing_type=sa.String(length=30),
        existing_nullable=False,
    )
