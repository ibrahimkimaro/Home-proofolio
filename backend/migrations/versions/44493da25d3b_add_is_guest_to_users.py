"""add is_guest to users

Revision ID: 44493da25d3b
Revises: e8c9d0f1a2b3
Create Date: 2026-10-10 07:19:33

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '44493da25d3b'
down_revision: Union[str, None] = 'e8c9d0f1a2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c['name'] for c in insp.get_columns('users')}
    if 'is_guest' not in cols:
        op.add_column('users', sa.Column('is_guest', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c['name'] for c in insp.get_columns('users')}
    if 'is_guest' in cols:
        op.drop_column('users', 'is_guest')
