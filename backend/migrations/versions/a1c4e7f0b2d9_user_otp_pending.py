"""user otp_pending: phone sign-ups must verify within a minute or the account is deleted

Revision ID: a1c4e7f0b2d9
Revises: 2f6e3a66468c
Create Date: 2026-10-01 14:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1c4e7f0b2d9'
down_revision: Union[str, None] = '2f6e3a66468c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing accounts default to false, so nobody already signed up is affected.
    op.add_column('users', sa.Column('otp_pending', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('users', 'otp_pending')
