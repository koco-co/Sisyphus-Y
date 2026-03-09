"""add performance indexes

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2025-01-01 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "e5f6g7h8i9j0"
down_revision: str | None = "d4e5f6g7h8i9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── 高频查询字段索引 ──────────────────────────────────────────
    op.create_index("ix_requirements_product_id", "requirements", ["product_id"])
    op.create_index("ix_requirements_iteration_id", "requirements", ["iteration_id"])
    op.create_index("ix_test_cases_requirement_id", "test_cases", ["requirement_id"])
    op.create_index("ix_test_points_scene_map_id", "test_points", ["scene_map_id"])
    op.create_index(
        "ix_generation_messages_session_id",
        "generation_messages",
        ["session_id"],
    )
    op.create_index(
        "ix_diagnosis_messages_session_id",
        "diagnosis_chat_messages",
        ["session_id"],
    )
    op.create_index(
        "ix_audit_logs_entity_type_entity_id",
        "audit_logs",
        ["entity_type", "entity_id"],
    )
    op.create_index("ix_import_records_job_id", "import_records", ["job_id"])

    # ── 软删除复合索引（加速 WHERE deleted_at IS NULL 扫描）─────
    op.create_index("ix_requirements_deleted_at", "requirements", ["deleted_at"])
    op.create_index("ix_test_cases_deleted_at", "test_cases", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_test_cases_deleted_at", table_name="test_cases")
    op.drop_index("ix_requirements_deleted_at", table_name="requirements")
    op.drop_index("ix_import_records_job_id", table_name="import_records")
    op.drop_index("ix_audit_logs_entity_type_entity_id", table_name="audit_logs")
    op.drop_index(
        "ix_diagnosis_messages_session_id",
        table_name="diagnosis_chat_messages",
    )
    op.drop_index(
        "ix_generation_messages_session_id",
        table_name="generation_messages",
    )
    op.drop_index("ix_test_points_scene_map_id", table_name="test_points")
    op.drop_index("ix_test_cases_requirement_id", table_name="test_cases")
    op.drop_index("ix_requirements_iteration_id", table_name="requirements")
    op.drop_index("ix_requirements_product_id", table_name="requirements")
