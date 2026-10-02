import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.profile import Visibility
from app.schemas.otp import OtpLogOut


class AdminStatsOut(BaseModel):
    total_users: int
    total_works: int
    total_otps_sent: int
    total_otps_verified: int
    admin_count: int


class AdminUserOut(BaseModel):
    id: uuid.UUID
    email: str
    fullname: str
    username: str
    phone_number: str | None = None
    is_admin: bool
    is_active: bool
    created_at: datetime
    works_count: int = 0


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class AdminWorkOut(BaseModel):
    id: uuid.UUID
    title: str
    work_type: str
    status: str
    visibility: Visibility
    skills: list[str]
    owner_id: uuid.UUID
    owner_username: str
    owner_fullname: str
    created_at: datetime
    updated_at: datetime


class AdminWorkUpdate(BaseModel):
    status: str | None = None
    visibility: Visibility | None = None
