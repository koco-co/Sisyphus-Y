"""add api_keys and vector_config to ai_configurations

Revision ID: ee8a72884ae2
Revises: a9099d7b99cf
Create Date: 2026-03-11 23:27:01.731125

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ee8a72884ae2'
down_revision: Union[str, Sequence[str], None] = 'a9099d7b99cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add api_keys and vector_config columns to ai_configurations."""
    op.add_column(
        "ai_configurations",
        sa.Column("api_keys", sa.dialects.postgresql.JSONB(), nullable=True),
    )
    op.add_column(
        "ai_configurations",
        sa.Column("vector_config", sa.dialects.postgresql.JSONB(), nullable=True),
    )


def downgrade() -> None:
    """Remove api_keys and vector_config columns."""
    op.drop_column("ai_configurations", "vector_config")
    op.drop_column("ai_configurations", "api_keys")
