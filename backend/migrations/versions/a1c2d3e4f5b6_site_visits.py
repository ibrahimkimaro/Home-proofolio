"""site visits: one row per page view, for the admin visitor counts

Revision ID: a1c2d3e4f5b6
Revises: e3d8f7a1c9b2
Create Date: 2026-10-10 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'a1c2d3e4f5b6'
down_revision: Union[str, None] = 'e3d8f7a1c9b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if sa.inspect(op.get_bind()).has_table('site_visits'):
        return
    op.create_table(
        'site_visits',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('visitor_id', sa.String(64), nullable=False),
        sa.Column('path', sa.String(200), nullable=False),
        sa.Column('referrer', sa.String(200), nullable=True),
        sa.Column('device', sa.String(60), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_site_visits_created', 'site_visits', ['created_at'])
    op.create_index('ix_site_visits_visitor', 'site_visits', ['visitor_id', 'created_at'])


def downgrade() -> None:
    if sa.inspect(op.get_bind()).has_table('site_visits'):
        op.drop_table('site_visits')
