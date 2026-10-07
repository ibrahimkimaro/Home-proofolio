"""activation clock: when an unactivated account's 15 minutes run out it becomes restricted (support only)

Revision ID: c0e2a4b6d8f7
Revises: b9d1f3a5c7e6
Create Date: 2026-10-04 20:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c0e2a4b6d8f7'
down_revision: Union[str, None] = 'b9d1f3a5c7e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Set once, when the first activation code is delivered (+15 min). Past it, an account that is still
    # otp_pending is suspended: it can only use support and enter a code, until it activates.
    op.add_column('users', sa.Column('activation_deadline', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'activation_deadline')
