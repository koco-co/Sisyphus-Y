"""add api_keys and vector_config to ai_configurations

Revision ID: f1a2b3c4d5e6
Revises: a9099d7b99cf
Create Date: 2026-03-11 13:35:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'a9099d7b99cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'ai_configurations',
        sa.Column('api_keys', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        'ai_configurations',
        sa.Column('vector_config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('ai_configurations', 'vector_config')
    op.drop_column('ai_configurations', 'api_keys')
