import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class OtpGenerateRequest(BaseModel):
    destination: str
    channel: str = "phone"  # 'phone' or 'email'
    purpose: str = "registration"


class OtpGenerateResponse(BaseModel):
    success: bool
    message: str
    destination: str
    channel: str
    code: str
    expires_in_seconds: int = 600
    # emailed (went out by email) | manual (waiting for an admin to send it)
    delivery: str = "manual"
    user_name: str | None = None


class OtpVerifyRequest(BaseModel):
    destination: str
    code: str


class OtpVerifyResponse(BaseModel):
    verified: bool
    message: str


class OtpLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    destination: str
    channel: str
    code: str
    purpose: str
    is_verified: bool
    delivery_status: str
    sent_via: str | None = None
    expires_at: datetime
    created_at: datetime
    verified_at: datetime | None = None
