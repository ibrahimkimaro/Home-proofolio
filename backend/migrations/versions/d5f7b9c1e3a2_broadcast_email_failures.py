"""admin messages: count the emails that couldn't be delivered

Revision ID: d5f7b9c1e3a2
Revises: c4e6a8b0d2f1
Create Date: 2026-10-04 11:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd5f7b9c1e3a2'
down_revision: Union[str, None] = 'c4e6a8b0d2f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('broadcasts', sa.Column('failed', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('broadcasts', 'failed')
