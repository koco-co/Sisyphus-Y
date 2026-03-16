"""add missing is_system column to test_case_folders

Revision ID: h1i2j3k4l5m6
Revises: edfd557e5470
Branch_labels: None
Depends_on: None
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text

revision = "h1i2j3k4l5m6"
down_revision = "edfd557e5470"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("test_case_folders")]
    if "is_system" not in columns:
        op.add_column(
            "test_case_folders",
            sa.Column("is_system", sa.Boolean(), server_default="false", nullable=False),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("test_case_folders")]
    if "is_system" in columns:
        op.drop_column("test_case_folders", "is_system")
