"""create coverage and export tables

Revision ID: 8f4b46d7a911
Revises: d21ab83a6d2b
Create Date: 2026-03-10 10:57:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8f4b46d7a911"
down_revision: str | Sequence[str] | None = "d21ab83a6d2b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "coverage_matrices",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requirement_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scene_node_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("test_case_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "coverage_type",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'none'"),
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"]),
        sa.ForeignKeyConstraint(["test_case_id"], ["test_cases.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_coverage_matrices_requirement_id",
        "coverage_matrices",
        ["requirement_id"],
        unique=False,
    )
    op.create_index(
        "ix_coverage_matrices_scene_node_id",
        "coverage_matrices",
        ["scene_node_id"],
        unique=False,
    )
    op.create_index(
        "ix_coverage_matrices_test_case_id",
        "coverage_matrices",
        ["test_case_id"],
        unique=False,
    )
    op.create_index(
        "ix_coverage_matrices_deleted_at",
        "coverage_matrices",
        ["deleted_at"],
        unique=False,
    )

    op.create_table(
        "export_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("iteration_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("requirement_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("format", sa.String(length=20), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("file_path", sa.Text(), nullable=True),
        sa.Column("filter_criteria", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "case_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["iteration_id"], ["iterations.id"]),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_export_jobs_iteration_id", "export_jobs", ["iteration_id"], unique=False)
    op.create_index("ix_export_jobs_requirement_id", "export_jobs", ["requirement_id"], unique=False)
    op.create_index("ix_export_jobs_deleted_at", "export_jobs", ["deleted_at"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_export_jobs_deleted_at", table_name="export_jobs")
    op.drop_index("ix_export_jobs_requirement_id", table_name="export_jobs")
    op.drop_index("ix_export_jobs_iteration_id", table_name="export_jobs")
    op.drop_table("export_jobs")

    op.drop_index("ix_coverage_matrices_deleted_at", table_name="coverage_matrices")
    op.drop_index("ix_coverage_matrices_test_case_id", table_name="coverage_matrices")
    op.drop_index("ix_coverage_matrices_scene_node_id", table_name="coverage_matrices")
    op.drop_index("ix_coverage_matrices_requirement_id", table_name="coverage_matrices")
    op.drop_table("coverage_matrices")
