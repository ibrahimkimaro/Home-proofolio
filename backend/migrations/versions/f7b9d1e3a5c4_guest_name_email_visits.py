"""guest support: the name and (optional) email a visitor gives, and how many times they've come back

Revision ID: f7b9d1e3a5c4
Revises: e6a8c0d2f4b3
Create Date: 2026-10-04 13:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f7b9d1e3a5c4'
down_revision: Union[str, None] = 'e6a8c0d2f4b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('guests', sa.Column('name', sa.String(60), nullable=True))
    op.add_column('guests', sa.Column('email', sa.String(255), nullable=True))
    op.add_column('guests', sa.Column('visits', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    op.drop_column('guests', 'visits')
    op.drop_column('guests', 'email')
    op.drop_column('guests', 'name')
