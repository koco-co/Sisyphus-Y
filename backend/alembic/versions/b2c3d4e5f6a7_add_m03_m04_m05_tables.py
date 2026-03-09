"""add m03 m04 m05 tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-10 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- M04: scene_map ---
    op.create_table(
        "scene_maps",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requirement_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(20), server_default="draft", nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scene_maps_requirement_id", "scene_maps", ["requirement_id"], unique=True)

    op.create_table(
        "test_points",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scene_map_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_name", sa.String(50), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(10), server_default="P1", nullable=False),
        sa.Column("status", sa.String(20), server_default="ai_generated", nullable=False),
        sa.Column("estimated_cases", sa.Integer(), server_default="3", nullable=False),
        sa.Column("source", sa.String(20), server_default="ai", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["scene_map_id"], ["scene_maps.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_test_points_scene_map_id", "test_points", ["scene_map_id"])

    # --- M03: diagnosis ---
    op.create_table(
        "diagnosis_reports",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requirement_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(20), server_default="running", nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("risk_count_high", sa.Integer(), server_default="0", nullable=False),
        sa.Column("risk_count_medium", sa.Integer(), server_default="0", nullable=False),
        sa.Column("risk_count_industry", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_diagnosis_reports_requirement_id", "diagnosis_reports", ["requirement_id"])

    op.create_table(
        "diagnosis_risks",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("level", sa.String(20), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("risk_status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["diagnosis_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_diagnosis_risks_report_id", "diagnosis_risks", ["report_id"])

    op.create_table(
        "diagnosis_chat_messages",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(10), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("round_num", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["diagnosis_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_diagnosis_chat_messages_report_id", "diagnosis_chat_messages", ["report_id"])

    # --- M05: generation ---
    op.create_table(
        "generation_sessions",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requirement_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mode", sa.String(30), server_default="test_point_driven", nullable=False),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("model_used", sa.String(50), server_default="gpt-4o", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_generation_sessions_requirement_id", "generation_sessions", ["requirement_id"])

    op.create_table(
        "generation_messages",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(10), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("thinking_content", sa.Text(), nullable=True),
        sa.Column("token_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["generation_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_generation_messages_session_id", "generation_messages", ["session_id"])


def downgrade() -> None:
    op.drop_table("generation_messages")
    op.drop_table("generation_sessions")
    op.drop_table("diagnosis_chat_messages")
    op.drop_table("diagnosis_risks")
    op.drop_table("diagnosis_reports")
    op.drop_table("test_points")
    op.drop_table("scene_maps")
