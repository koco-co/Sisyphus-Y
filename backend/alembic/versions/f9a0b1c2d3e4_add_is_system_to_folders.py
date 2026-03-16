"""add is_system to test_case_folders

Revision ID: f9a0b1c2d3e4
Revises: ee8a72884ae2
Branch_labels: None
Depends_on: None
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "f9a0b1c2d3e4"
down_revision = "ee8a72884ae2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()
    if "test_case_folders" not in tables:
        # Table does not exist yet — will be created by b3c4d5e6f7a8 migration
        return
    columns = [c["name"] for c in inspector.get_columns("test_case_folders")]
    if "is_system" not in columns:
        op.add_column(
            "test_case_folders",
            sa.Column("is_system", sa.Boolean(), server_default="false", nullable=False),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()
    if "test_case_folders" not in tables:
        return
    columns = [c["name"] for c in inspector.get_columns("test_case_folders")]
    if "is_system" in columns:
        op.drop_column("test_case_folders", "is_system")
