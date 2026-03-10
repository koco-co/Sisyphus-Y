"""create execution results table

Revision ID: c41e7d5f6a01
Revises: 9b2f6a4d1c77
Create Date: 2026-03-10 12:54:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c41e7d5f6a01"
down_revision: str | Sequence[str] | None = "9b2f6a4d1c77"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "execution_results",
        sa.Column("test_case_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("iteration_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("executor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("actual_result", sa.Text(), nullable=True),
        sa.Column("defect_id", sa.String(length=100), nullable=True),
        sa.Column("environment", sa.String(length=100), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("evidence", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["iteration_id"], ["iterations.id"]),
        sa.ForeignKeyConstraint(["test_case_id"], ["test_cases.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_execution_results_test_case_id", "execution_results", ["test_case_id"], unique=False)
    op.create_index("ix_execution_results_iteration_id", "execution_results", ["iteration_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_execution_results_iteration_id", table_name="execution_results")
    op.drop_index("ix_execution_results_test_case_id", table_name="execution_results")
    op.drop_table("execution_results")
