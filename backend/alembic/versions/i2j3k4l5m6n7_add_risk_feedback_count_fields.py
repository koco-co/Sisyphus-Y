"""add source_risk_id feedback actual_cases_count

Revision ID: i2j3k4l5m6n7
Revises: h1i2j3k4l5m6
Create Date: 2026-03-18

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision: str = "i2j3k4l5m6n7"
down_revision: str | Sequence[str] | None = "h1i2j3k4l5m6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # TASK-160: risk → test point traceability
    op.add_column("test_points", sa.Column("source_risk_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_test_points_source_risk",
        "test_points",
        "diagnosis_risks",
        ["source_risk_id"],
        ["id"],
    )

    # TASK-162: actual generated case count
    op.add_column("test_points", sa.Column("actual_cases_count", sa.Integer(), nullable=True))

    # TASK-161: case quality feedback
    op.add_column("test_cases", sa.Column("feedback", sa.String(10), nullable=True))
    op.add_column("test_cases", sa.Column("feedback_reason", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("test_cases", "feedback_reason")
    op.drop_column("test_cases", "feedback")
    op.drop_column("test_points", "actual_cases_count")
    op.drop_constraint("fk_test_points_source_risk", "test_points", type_="foreignkey")
    op.drop_column("test_points", "source_risk_id")
