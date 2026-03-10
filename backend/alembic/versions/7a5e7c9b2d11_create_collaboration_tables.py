"""create collaboration tables

Revision ID: 7a5e7c9b2d11
Revises: f3b27c1d8e92
Create Date: 2026-03-10 12:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7a5e7c9b2d11"
down_revision: str | Sequence[str] | None = "f3b27c1d8e92"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "collaboration_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["parent_id"], ["collaboration_comments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_collaboration_comments_entity_type",
        "collaboration_comments",
        ["entity_type"],
        unique=False,
    )
    op.create_index(
        "ix_collaboration_comments_entity_id",
        "collaboration_comments",
        ["entity_id"],
        unique=False,
    )
    op.create_index("ix_collaboration_comments_user_id", "collaboration_comments", ["user_id"], unique=False)

    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column(
            "reviewer_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reviews_entity_type", "reviews", ["entity_type"], unique=False)
    op.create_index("ix_reviews_entity_id", "reviews", ["entity_id"], unique=False)
    op.create_index("ix_reviews_created_by", "reviews", ["created_by"], unique=False)

    op.create_table(
        "review_decisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("review_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reviewer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("decision", sa.String(length=20), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["review_id"], ["reviews.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_review_decisions_review_id", "review_decisions", ["review_id"], unique=False)
    op.create_index("ix_review_decisions_reviewer_id", "review_decisions", ["reviewer_id"], unique=False)

    op.create_table(
        "review_share_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("review_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["review_id"], ["reviews.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_review_share_tokens_review_id", "review_share_tokens", ["review_id"], unique=False)
    op.create_index("ix_review_share_tokens_token", "review_share_tokens", ["token"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_review_share_tokens_token", table_name="review_share_tokens")
    op.drop_index("ix_review_share_tokens_review_id", table_name="review_share_tokens")
    op.drop_table("review_share_tokens")

    op.drop_index("ix_review_decisions_reviewer_id", table_name="review_decisions")
    op.drop_index("ix_review_decisions_review_id", table_name="review_decisions")
    op.drop_table("review_decisions")

    op.drop_index("ix_reviews_created_by", table_name="reviews")
    op.drop_index("ix_reviews_entity_id", table_name="reviews")
    op.drop_index("ix_reviews_entity_type", table_name="reviews")
    op.drop_table("reviews")

    op.drop_index("ix_collaboration_comments_user_id", table_name="collaboration_comments")
    op.drop_index("ix_collaboration_comments_entity_id", table_name="collaboration_comments")
    op.drop_index("ix_collaboration_comments_entity_type", table_name="collaboration_comments")
    op.drop_table("collaboration_comments")
