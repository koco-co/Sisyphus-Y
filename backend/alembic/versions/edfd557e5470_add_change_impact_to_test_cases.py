"""add_change_impact_to_test_cases

Revision ID: edfd557e5470
Revises: 4bf80568fe2c
Create Date: 2026-03-16 13:56:02.584061

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'edfd557e5470'
down_revision: Union[str, Sequence[str], None] = '4bf80568fe2c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add change_impact column to test_cases table."""
    op.add_column('test_cases', sa.Column('change_impact', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Remove change_impact column from test_cases table."""
    op.drop_column('test_cases', 'change_impact')
