import uuid
from datetime import date, datetime

import strawberry


@strawberry.type
class ProfileType:
    username: str
    display_name: str
    bio: str | None
    avatar_url: str | None
    visibility: str


@strawberry.type
class UserType:
    id: uuid.UUID
    email: str
    fullname: str
    username: str
    phone_number: str | None
    is_admin: bool
    created_at: datetime
    profile: ProfileType | None


@strawberry.type
class WorkType:
    id: uuid.UUID
    title: str
    description: str | None
    context_role: str | None
    occurred_on: date | None
    work_type: str
    status: str
    visibility: str
    skills: list[str]
    created_at: datetime
    updated_at: datetime


@strawberry.type
class AdminStatsType:
    total_users: int
    total_works: int
    total_otps_sent: int
    total_otps_verified: int
    admin_count: int


@strawberry.type
class AdminUserType:
    id: uuid.UUID
    email: str
    fullname: str
    username: str
    phone_number: str | None
    is_admin: bool
    is_active: bool
    created_at: datetime
    works_count: int
