"""add_requirement_folders

Revision ID: 7debb1206f5f
Revises: 028f76e3729f
Create Date: 2026-03-22 12:57:36.415877

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7debb1206f5f'
down_revision: Union[str, Sequence[str], None] = '028f76e3729f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'requirement_folders',
        sa.Column('iteration_id', sa.UUID(), nullable=False),
        sa.Column('parent_id', sa.UUID(), nullable=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('level', sa.Integer(), nullable=False),
        sa.Column('is_system', sa.Boolean(), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['iteration_id'], ['iterations.id']),
        sa.ForeignKeyConstraint(['parent_id'], ['requirement_folders.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_requirement_folders_iteration_id'), 'requirement_folders', ['iteration_id'], unique=False)
    op.create_index(op.f('ix_requirement_folders_parent_id'), 'requirement_folders', ['parent_id'], unique=False)
    op.add_column('requirements', sa.Column('folder_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_requirements_folder_id'), 'requirements', ['folder_id'], unique=False)
    op.create_foreign_key('fk_requirements_folder_id', 'requirements', 'requirement_folders', ['folder_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_requirements_folder_id', 'requirements', type_='foreignkey')
    op.drop_index(op.f('ix_requirements_folder_id'), table_name='requirements')
    op.drop_column('requirements', 'folder_id')
    op.drop_index(op.f('ix_requirement_folders_parent_id'), table_name='requirement_folders')
    op.drop_index(op.f('ix_requirement_folders_iteration_id'), table_name='requirement_folders')
    op.drop_table('requirement_folders')
