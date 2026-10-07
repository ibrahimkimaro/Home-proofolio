"""activation codes: remember whether the system emailed a code or an admin sent it by hand

Revision ID: e6a8c0d2f4b3
Revises: d5f7b9c1e3a2
Create Date: 2026-10-04 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e6a8c0d2f4b3'
down_revision: Union[str, None] = 'd5f7b9c1e3a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('otp_logs', sa.Column('sent_via', sa.String(20), nullable=True))  # email | admin


def downgrade() -> None:
    op.drop_column('otp_logs', 'sent_via')
