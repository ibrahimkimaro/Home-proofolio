import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.profile import Visibility

USERNAME_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$")


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: str
    fullname: str | None = None
    display_name: str | None = None
    phone_number: str | None = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str) -> str:
        v = v.lower()
        if not USERNAME_RE.match(v):
            raise ValueError(
                "username must be 3-50 lowercase letters, numbers, or hyphens, "
                "and cannot start or end with a hyphen"
            )
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    username: str
    display_name: str
    headline: str | None = None
    bio: str | None
    avatar_url: str | None
    visibility: Visibility
    allow_indexing: bool = True


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=150)
    headline: str | None = Field(default=None, max_length=160)
    bio: str | None = Field(default=None, max_length=600)
    username: str | None = None
    visibility: Visibility | None = None
    allow_indexing: bool | None = None

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip().lower()
        if not USERNAME_RE.match(v):
            raise ValueError("Use 3-50 lowercase letters, numbers or hyphens")
        return v


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    fullname: str
    username: str
    phone_number: str | None = None
    is_admin: bool = False
    otp_pending: bool = False
    suspended: bool = False  # not activated within 15 minutes of the code: support only
    activation_deadline: datetime | None = None
    created_at: datetime
    profile: ProfileOut
    preferences: dict = {}


class UsernameCheckOut(BaseModel):
    available: bool
    username: str
    message: str
    suggestions: list[str] = []


class VerifyAccountRequest(BaseModel):
    code: str


class SendCodeRequest(BaseModel):
    channel: Literal["phone", "email"] = "phone"


class ActivationStatus(BaseModel):
    """What the member sees about their activation code. Never includes the code itself."""
    channel: Literal["phone", "email"]
    destination: str
    sent: bool  # an admin has delivered it; the countdown runs from then
    expires_in_seconds: int | None = None  # only once sent
    suspends_in_seconds: int | None = None  # the account is suspended when this runs out (set once the first code went out)
    resend_in_seconds: int = 0
