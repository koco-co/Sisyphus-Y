"""align runtime schema

Revision ID: f817de7fa899
Revises: e5f6g7h8i9j0
Create Date: 2026-03-10 01:50:48.527515

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f817de7fa899"
down_revision: str | None = "e5f6g7h8i9j0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_table(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def _columns(table_name: str) -> set[str]:
    if not _has_table(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    """Upgrade schema."""
    if _has_table("test_cases"):
        test_case_columns = _columns("test_cases")
        if "test_point_id" in test_case_columns and "scene_node_id" not in test_case_columns:
            op.alter_column(
                "test_cases",
                "test_point_id",
                new_column_name="scene_node_id",
                existing_type=postgresql.UUID(as_uuid=True),
                existing_nullable=True,
            )

        op.execute(
            "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS generation_session_id UUID"
        )
        op.execute(
            "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS module_path VARCHAR(200)"
        )
        op.execute(
            "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS steps JSONB NOT NULL DEFAULT '[]'::jsonb"
        )
        op.execute(
            "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb"
        )
        op.execute(
            "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS created_by UUID"
        )
        op.execute(
            "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS reviewer_id UUID"
        )
        op.execute(
            "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS review_comment TEXT"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_test_cases_scene_node_id ON test_cases (scene_node_id)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_test_cases_generation_session_id ON test_cases (generation_session_id)"
        )

    if _has_table("test_points"):
        op.execute(
            "ALTER TABLE test_points ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0"
        )

    if _has_table("audit_logs"):
        audit_columns = _columns("audit_logs")
        if "resource" in audit_columns and "entity_type" not in audit_columns:
            op.alter_column(
                "audit_logs",
                "resource",
                new_column_name="entity_type",
                existing_type=sa.String(length=50),
                existing_nullable=False,
            )
        if "resource_id" in audit_columns and "entity_id" not in audit_columns:
            op.alter_column(
                "audit_logs",
                "resource_id",
                new_column_name="entity_id",
                existing_type=postgresql.UUID(as_uuid=True),
                existing_nullable=True,
            )
        if "detail" in audit_columns and "new_value" not in audit_columns:
            op.alter_column(
                "audit_logs",
                "detail",
                new_column_name="new_value",
                existing_type=postgresql.JSONB(astext_type=sa.Text()),
                existing_nullable=True,
            )

        op.execute(
            "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB"
        )
        op.execute(
            "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_type_entity_id ON audit_logs (entity_type, entity_id)"
        )


def downgrade() -> None:
    """Downgrade schema."""
    if _has_table("audit_logs"):
        op.execute("DROP INDEX IF EXISTS ix_audit_logs_entity_type_entity_id")
        op.execute("ALTER TABLE audit_logs DROP COLUMN IF EXISTS user_agent")
        op.execute("ALTER TABLE audit_logs DROP COLUMN IF EXISTS old_value")
        audit_columns = _columns("audit_logs")
        if "new_value" in audit_columns and "detail" not in audit_columns:
            op.alter_column(
                "audit_logs",
                "new_value",
                new_column_name="detail",
                existing_type=postgresql.JSONB(astext_type=sa.Text()),
                existing_nullable=True,
            )
        if "entity_id" in audit_columns and "resource_id" not in audit_columns:
            op.alter_column(
                "audit_logs",
                "entity_id",
                new_column_name="resource_id",
                existing_type=postgresql.UUID(as_uuid=True),
                existing_nullable=True,
            )
        if "entity_type" in audit_columns and "resource" not in audit_columns:
            op.alter_column(
                "audit_logs",
                "entity_type",
                new_column_name="resource",
                existing_type=sa.String(length=50),
                existing_nullable=False,
            )

    if _has_table("test_points"):
        op.execute("ALTER TABLE test_points DROP COLUMN IF EXISTS sort_order")

    if _has_table("test_cases"):
        op.execute("DROP INDEX IF EXISTS ix_test_cases_generation_session_id")
        op.execute("DROP INDEX IF EXISTS ix_test_cases_scene_node_id")
        op.execute("ALTER TABLE test_cases DROP COLUMN IF EXISTS review_comment")
        op.execute("ALTER TABLE test_cases DROP COLUMN IF EXISTS reviewer_id")
        op.execute("ALTER TABLE test_cases DROP COLUMN IF EXISTS created_by")
        op.execute("ALTER TABLE test_cases DROP COLUMN IF EXISTS tags")
        op.execute("ALTER TABLE test_cases DROP COLUMN IF EXISTS steps")
        op.execute("ALTER TABLE test_cases DROP COLUMN IF EXISTS module_path")
        op.execute("ALTER TABLE test_cases DROP COLUMN IF EXISTS generation_session_id")
        test_case_columns = _columns("test_cases")
        if "scene_node_id" in test_case_columns and "test_point_id" not in test_case_columns:
            op.alter_column(
                "test_cases",
                "scene_node_id",
                new_column_name="test_point_id",
                existing_type=postgresql.UUID(as_uuid=True),
                existing_nullable=True,
            )
