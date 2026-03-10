"""add performance indexes

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2025-01-01 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e5f6g7h8i9j0"
down_revision: str | None = "d4e5f6g7h8i9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _existing_columns(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table(table_name):
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def _create_index_if_possible(name: str, table_name: str, columns: list[str]) -> None:
    if not set(columns).issubset(_existing_columns(table_name)):
        return
    joined = ", ".join(columns)
    op.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {table_name} ({joined})")


def upgrade() -> None:
    # ── 高频查询字段索引 ──────────────────────────────────────────
    _create_index_if_possible("ix_requirements_product_id", "requirements", ["product_id"])
    _create_index_if_possible("ix_requirements_iteration_id", "requirements", ["iteration_id"])
    _create_index_if_possible("ix_test_cases_requirement_id", "test_cases", ["requirement_id"])
    _create_index_if_possible("ix_test_points_scene_map_id", "test_points", ["scene_map_id"])
    _create_index_if_possible("ix_generation_messages_session_id", "generation_messages", ["session_id"])
    _create_index_if_possible("ix_diagnosis_messages_session_id", "diagnosis_chat_messages", ["session_id"])
    _create_index_if_possible("ix_audit_logs_entity_type_entity_id", "audit_logs", ["entity_type", "entity_id"])
    _create_index_if_possible("ix_import_records_job_id", "import_records", ["job_id"])

    # ── 软删除复合索引（加速 WHERE deleted_at IS NULL 扫描）─────
    _create_index_if_possible("ix_requirements_deleted_at", "requirements", ["deleted_at"])
    _create_index_if_possible("ix_test_cases_deleted_at", "test_cases", ["deleted_at"])


def downgrade() -> None:
    for table_name, index_name in (
        ("test_cases", "ix_test_cases_deleted_at"),
        ("requirements", "ix_requirements_deleted_at"),
        ("import_records", "ix_import_records_job_id"),
        ("audit_logs", "ix_audit_logs_entity_type_entity_id"),
        ("diagnosis_chat_messages", "ix_diagnosis_messages_session_id"),
        ("generation_messages", "ix_generation_messages_session_id"),
        ("test_points", "ix_test_points_scene_map_id"),
        ("test_cases", "ix_test_cases_requirement_id"),
        ("requirements", "ix_requirements_iteration_id"),
        ("requirements", "ix_requirements_product_id"),
    ):
        if _existing_columns(table_name):
            op.execute(f"DROP INDEX IF EXISTS {index_name}")
