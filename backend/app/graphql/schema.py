import strawberry
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.graphql.context import GraphQLContext
from app.graphql.types import (
    AdminStatsType,
    AdminUserType,
    ProfileType,
    UserType,
    WorkType,
)
from app.models.otp import OtpLog
from app.models.profile import Profile
from app.models.user import User
from app.models.work import WorkItem


def _to_profile(profile: Profile | None) -> ProfileType | None:
    if profile is None:
        return None
    return ProfileType(
        username=profile.username,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        visibility=profile.visibility.value,
    )


def _to_user(user: User) -> UserType:
    return UserType(
        id=user.id,
        email=user.email,
        fullname=user.fullname,
        username=user.username,
        phone_number=user.phone_number,
        is_admin=user.is_admin,
        created_at=user.created_at,
        profile=_to_profile(user.profile),
    )


def _to_work(work: WorkItem) -> WorkType:
    return WorkType(
        id=work.id,
        title=work.title,
        description=work.description,
        context_role=work.context_role,
        occurred_on=work.occurred_on,
        work_type=work.work_type,
        status=work.status,
        visibility=work.visibility.value,
        skills=list(work.skills or []),
        created_at=work.created_at,
        updated_at=work.updated_at,
    )


def _require_admin(context: GraphQLContext) -> User:
    if context.user is None:
        raise Exception("Not authenticated")
    if not context.user.is_admin:
        raise Exception("Admin access required")
    return context.user


@strawberry.type
class Query:
    @strawberry.field(description="The signed-in user, or null if not authenticated.")
    async def me(self, info: strawberry.Info[GraphQLContext]) -> UserType | None:
        user = info.context.user
        return _to_user(user) if user else None

    @strawberry.field(description="The signed-in user's own work items.")
    async def works(self, info: strawberry.Info[GraphQLContext]) -> list[WorkType]:
        user = info.context.user
        if user is None:
            return []
        result = await info.context.db.execute(
            select(WorkItem).where(WorkItem.user_id == user.id).order_by(WorkItem.updated_at.desc())
        )
        return [_to_work(w) for w in result.scalars().all()]

    @strawberry.field(description="Platform-wide stats. Admin accounts only.")
    async def admin_stats(self, info: strawberry.Info[GraphQLContext]) -> AdminStatsType:
        _require_admin(info.context)
        db = info.context.db
        user_count = await db.scalar(select(func.count(User.id))) or 0
        work_count = await db.scalar(select(func.count(WorkItem.id))) or 0
        otp_sent = await db.scalar(select(func.count(OtpLog.id))) or 0
        otp_verified = (
            await db.scalar(select(func.count(OtpLog.id)).where(OtpLog.is_verified == True)) or 0
        )
        admin_count = await db.scalar(select(func.count(User.id)).where(User.is_admin == True)) or 0
        return AdminStatsType(
            total_users=user_count,
            total_works=work_count,
            total_otps_sent=otp_sent,
            total_otps_verified=otp_verified,
            admin_count=admin_count,
        )

    @strawberry.field(description="Every registered user. Admin accounts only.")
    async def admin_users(self, info: strawberry.Info[GraphQLContext]) -> list[AdminUserType]:
        _require_admin(info.context)
        result = await info.context.db.execute(
            select(User).options(selectinload(User.work_items)).order_by(User.created_at.desc())
        )
        users = result.scalars().all()
        return [
            AdminUserType(
                id=u.id,
                email=u.email,
                fullname=u.fullname,
                username=u.username,
                phone_number=u.phone_number,
                is_admin=u.is_admin,
                is_active=u.is_active,
                created_at=u.created_at,
                works_count=len(u.work_items),
            )
            for u in users
        ]


schema = strawberry.Schema(query=Query)
