"""companions grant no data access until the user says yes

Revision ID: f3b5d7e9a1c2
Revises: e2a4c6b8d0f1
Create Date: 2026-10-06 08:00:00

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'f3b5d7e9a1c2'
down_revision: Union[str, None] = 'e2a4c6b8d0f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('companions', 'access_permissions', server_default='[]')


def downgrade() -> None:
    op.alter_column('companions', 'access_permissions', server_default='["profile", "projects"]')
