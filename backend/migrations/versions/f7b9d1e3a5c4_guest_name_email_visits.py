"""guest support: the name and (optional) email a visitor gives, and how many times they've come back

Revision ID: f7b9d1e3a5c4
Revises: e6a8c0d2f4b3
Create Date: 2026-10-04 13:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'f7b9d1e3a5c4'
down_revision: Union[str, None] = 'e6a8c0d2f4b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    has_guests = insp.has_table('guests')
    if not has_guests:
        op.create_table(
            'guests',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('session_id', sa.String(64), nullable=False, unique=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
            sa.Column('ip_address', sa.String(45), nullable=True),
            sa.Column('user_agent', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('last_seen_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('name', sa.String(60), nullable=True),
            sa.Column('email', sa.String(255), nullable=True),
            sa.Column('visits', sa.Integer(), server_default='1', nullable=False),
        )
        op.create_index('ix_guests_session_id', 'guests', ['session_id'])
    else:
        cols = {c['name'] for c in insp.get_columns('guests')}
        if 'name' not in cols:
            op.add_column('guests', sa.Column('name', sa.String(60), nullable=True))
        if 'email' not in cols:
            op.add_column('guests', sa.Column('email', sa.String(255), nullable=True))
        if 'visits' not in cols:
            op.add_column('guests', sa.Column('visits', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if insp.has_table('guests'):
        cols = {c['name'] for c in insp.get_columns('guests')}
        if 'visits' in cols:
            op.drop_column('guests', 'visits')
        if 'email' in cols:
            op.drop_column('guests', 'email')
        if 'name' in cols:
            op.drop_column('guests', 'name')

