"""v2.0 model restructure: model configs, prompts, folders, recycle

Revision ID: b3c4d5e6f7a8
Revises: f817de7fa899
Create Date: 2026-03-13 17:30:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b3c4d5e6f7a8"
down_revision = "f817de7fa899"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── ModelConfiguration ──
    op.create_table(
        "model_configurations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False, index=True),
        sa.Column("model_id", sa.String(100), nullable=False),
        sa.Column("base_url", sa.String(500), nullable=True),
        sa.Column("api_key_encrypted", sa.Text(), nullable=True),
        sa.Column("temperature", sa.Float(), server_default="0.7"),
        sa.Column("max_tokens", sa.Integer(), nullable=True),
        sa.Column("purpose_tags", postgresql.JSONB(), server_default="[]"),
        sa.Column("is_enabled", sa.Boolean(), server_default="true"),
        sa.Column("is_default", sa.Boolean(), server_default="false"),
        sa.Column("extra_params", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── PromptConfiguration ──
    op.create_table(
        "prompt_configurations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("module", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column("is_customized", sa.Boolean(), server_default="false"),
        sa.Column("version", sa.Integer(), server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── PromptHistory ──
    op.create_table(
        "prompt_histories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("module", sa.String(50), nullable=False, index=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column("change_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── TestCaseFolder ──
    op.create_table(
        "test_case_folders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("test_case_folders.id"),
            nullable=True,
            index=True,
        ),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("level", sa.Integer(), server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── RecycleItem ──
    op.create_table(
        "recycle_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("object_type", sa.String(50), nullable=False, index=True),
        sa.Column("object_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("object_name", sa.String(300), nullable=False),
        sa.Column("object_snapshot", postgresql.JSONB(), nullable=True),
        sa.Column("deleted_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── Add columns to existing tables ──

    # TestCase.folder_id
    op.add_column(
        "test_cases",
        sa.Column(
            "folder_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("test_case_folders.id"),
            nullable=True,
            index=True,
        ),
    )

    # KnowledgeDocument: category, entry_type, is_active
    op.add_column(
        "knowledge_documents",
        sa.Column("category", sa.String(50), server_default="business_rule", index=True),
    )
    op.add_column(
        "knowledge_documents",
        sa.Column("entry_type", sa.String(20), server_default="file"),
    )
    op.add_column(
        "knowledge_documents",
        sa.Column("is_active", sa.Boolean(), server_default="true"),
    )

    # TestCaseTemplate: template_type, applicable_module
    op.add_column(
        "test_case_templates",
        sa.Column("template_type", sa.String(30), server_default="prompt"),
    )
    op.add_column(
        "test_case_templates",
        sa.Column("applicable_module", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("test_case_templates", "applicable_module")
    op.drop_column("test_case_templates", "template_type")
    op.drop_column("knowledge_documents", "is_active")
    op.drop_column("knowledge_documents", "entry_type")
    op.drop_column("knowledge_documents", "category")
    op.drop_column("test_cases", "folder_id")
    op.drop_table("recycle_items")
    op.drop_table("test_case_folders")
    op.drop_table("prompt_histories")
    op.drop_table("prompt_configurations")
    op.drop_table("model_configurations")
