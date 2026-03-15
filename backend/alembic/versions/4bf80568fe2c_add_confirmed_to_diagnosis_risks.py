"""add_confirmed_to_diagnosis_risks

Revision ID: 4bf80568fe2c
Revises: ec4b13b4028c
Create Date: 2026-03-15 20:09:34.137965

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '4bf80568fe2c'
down_revision: Union[str, Sequence[str], None] = 'ec4b13b4028c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add confirmed boolean column to diagnosis_risks table."""
    op.add_column(
        'diagnosis_risks',
        sa.Column('confirmed', sa.Boolean(), server_default='false', nullable=False),
    )


def downgrade() -> None:
    """Remove confirmed column from diagnosis_risks table."""
    op.drop_column('diagnosis_risks', 'confirmed')
