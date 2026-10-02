from dataclasses import dataclass, field
from datetime import datetime, timezone

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from strawberry.fastapi import BaseContext

from app.api.deps import SESSION_COOKIE_NAME
from app.core.database import get_db
from app.core.security import hash_session_token
from app.models.session import Session as SessionModel
from app.models.user import User


@dataclass
class GraphQLContext(BaseContext):
    db: AsyncSession
    user: User | None


async def get_context(request: Request, db: AsyncSession = Depends(get_db)) -> GraphQLContext:
    """Reuses the same session cookie as the REST API, so a GraphQL client
    authenticates by sending the same `session_token` cookie set by /auth/login.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    user: User | None = None

    if token:
        token_hash = hash_session_token(token)
        result = await db.execute(select(SessionModel).where(SessionModel.token_hash == token_hash))
        session = result.scalar_one_or_none()
        if session is not None and session.expires_at >= datetime.now(timezone.utc):
            result = await db.execute(
                select(User).options(selectinload(User.profile)).where(User.id == session.user_id)
            )
            candidate = result.scalar_one_or_none()
            if candidate is not None and candidate.is_active:
                user = candidate

    return GraphQLContext(db=db, user=user)
