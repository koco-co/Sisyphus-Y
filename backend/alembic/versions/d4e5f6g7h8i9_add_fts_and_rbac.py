"""add full-text search indexes and rbac tables

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-03-15 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4e5f6g7h8i9"
down_revision: str | Sequence[str] | None = "c3d4e5f6g7h8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── RBAC tables ──────────────────────────────────────────────
    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(30), unique=True, nullable=False, index=True),
        sa.Column("description", sa.String(200)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "user_roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id"), nullable=False, index=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "role_id", name="uq_user_role"),
    )

    # ── Full-text search: tsvector columns + GIN indexes ─────────
    # requirements
    op.execute("""
        ALTER TABLE requirements
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(req_id, ''))
        ) STORED;
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_requirements_fts
        ON requirements USING GIN (search_vector);
    """)

    # test_cases
    op.execute("""
        ALTER TABLE test_cases
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(case_id, ''))
        ) STORED;
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_test_cases_fts
        ON test_cases USING GIN (search_vector);
    """)

    # test_points
    op.execute("""
        ALTER TABLE test_points
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
        ) STORED;
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_test_points_fts
        ON test_points USING GIN (search_vector);
    """)

    # knowledge_documents
    op.execute("""
        ALTER TABLE knowledge_documents
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('simple', coalesce(title, ''))
        ) STORED;
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_knowledge_documents_fts
        ON knowledge_documents USING GIN (search_vector);
    """)

    # Seed default roles
    op.execute("""
        INSERT INTO roles (id, name, description) VALUES
            (gen_random_uuid(), 'admin', 'Full system access'),
            (gen_random_uuid(), 'pm', 'Product Manager — manage requirements and test plans'),
            (gen_random_uuid(), 'tester', 'Tester — execute and manage test cases'),
            (gen_random_uuid(), 'dev', 'Developer — read-only access to requirements and cases'),
            (gen_random_uuid(), 'viewer', 'Viewer — read-only minimal access')
        ON CONFLICT (name) DO NOTHING;
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_knowledge_documents_fts;")
    op.execute("ALTER TABLE knowledge_documents DROP COLUMN IF EXISTS search_vector;")
    op.execute("DROP INDEX IF EXISTS idx_test_points_fts;")
    op.execute("ALTER TABLE test_points DROP COLUMN IF EXISTS search_vector;")
    op.execute("DROP INDEX IF EXISTS idx_test_cases_fts;")
    op.execute("ALTER TABLE test_cases DROP COLUMN IF EXISTS search_vector;")
    op.execute("DROP INDEX IF EXISTS idx_requirements_fts;")
    op.execute("ALTER TABLE requirements DROP COLUMN IF EXISTS search_vector;")
    op.drop_table("user_roles")
    op.drop_table("roles")
