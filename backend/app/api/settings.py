"""Account settings: email/phone, password, signed-in devices, data export, account deletion."""
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SESSION_COOKIE_NAME, get_current_user
from app.api.uploads import UPLOAD_DIR
from app.core.database import get_db
from app.core.security import hash_password, hash_session_token, verify_password
from app.models.business import Business, BusinessMember, Follow, Role, Watch
from app.models.session import Session as SessionModel
from app.models.user import User
from app.models.work import Upload, WorkEvent, WorkItem
from app.schemas.preferences import Preferences

router = APIRouter(prefix="/me", tags=["settings"])


def _check_password(user: User, password: str | None) -> None:
    if not password or not verify_password(password, user.password_hash):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your current password is incorrect")


# ---------- account ----------

class AccountOut(BaseModel):
    email: str
    phone_number: str | None
    created_at: datetime


class AccountUpdate(BaseModel):
    email: EmailStr | None = None
    phone_number: str | None = Field(default=None, max_length=50)
    current_password: str | None = None  # required to change email


@router.get("/account", response_model=AccountOut)
async def get_account(user: User = Depends(get_current_user)):
    return AccountOut(email=user.email, phone_number=user.phone_number, created_at=user.created_at)


@router.patch("/account", response_model=AccountOut)
async def update_account(payload: AccountUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    new_email = data.get("email")
    if new_email and new_email.lower() != user.email.lower():
        _check_password(user, payload.current_password)  # an email change is an account takeover vector
        taken = await db.scalar(select(func.count()).select_from(User).where(func.lower(User.email) == new_email.lower(), User.id != user.id))
        if taken:
            raise HTTPException(status.HTTP_409_CONFLICT, "That email is already used by another account")
        user.email = new_email
    if "phone_number" in data:
        user.phone_number = (data["phone_number"] or "").strip() or None
    await db.commit()
    return AccountOut(email=user.email, phone_number=user.phone_number, created_at=user.created_at)


# ---------- preferences (synced across devices) ----------

@router.get("/preferences", response_model=Preferences)
async def get_preferences(user: User = Depends(get_current_user)):
    return Preferences.model_validate(user.preferences or {})


@router.put("/preferences", response_model=Preferences)
async def save_preferences(payload: Preferences, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user.preferences = {**(user.preferences or {}), **payload.model_dump(mode="json", exclude_none=True)}
    await db.commit()
    return Preferences.model_validate(user.preferences)


# ---------- password ----------

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: PasswordChange,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
):
    _check_password(user, payload.current_password)
    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Choose a password you haven't used here")
    user.password_hash = hash_password(payload.new_password)
    # A changed password signs out every other device; this one stays signed in.
    await db.execute(
        delete(SessionModel).where(SessionModel.user_id == user.id, SessionModel.token_hash != hash_session_token(session_token or ""))
    )
    await db.commit()


# ---------- signed-in devices ----------

class SessionOut(BaseModel):
    id: uuid.UUID
    user_agent: str | None
    ip: str | None = None
    created_at: datetime
    last_seen_at: datetime | None = None
    expires_at: datetime
    current: bool


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
):
    current = hash_session_token(session_token or "")
    rows = await db.execute(
        select(SessionModel)
        .where(SessionModel.user_id == user.id, SessionModel.expires_at > datetime.now(timezone.utc))
        .order_by(SessionModel.created_at.desc())
    )
    return [
        SessionOut(id=s.id, user_agent=s.user_agent, ip=s.ip, created_at=s.created_at, last_seen_at=s.last_seen_at,
                   expires_at=s.expires_at, current=s.token_hash == current)
        for s in rows.scalars()
    ]


@router.delete("/sessions", status_code=status.HTTP_204_NO_CONTENT)
async def sign_out_others(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
):
    await db.execute(
        delete(SessionModel).where(SessionModel.user_id == user.id, SessionModel.token_hash != hash_session_token(session_token or ""))
    )
    await db.commit()


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def sign_out_device(session_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(SessionModel).where(SessionModel.id == session_id, SessionModel.user_id == user.id))
    await db.commit()


# ---------- your data ----------

def _row(obj) -> dict:
    out = {}
    for c in obj.__table__.columns:
        v = getattr(obj, c.key)
        if c.key in ("password_hash", "token_hash"):
            continue
        out[c.key] = v.isoformat() if isinstance(v, (datetime, date)) else str(v) if isinstance(v, uuid.UUID) else getattr(v, "value", v)
    return out


@router.get("/export")
async def export_my_data(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Everything we hold about you, as one JSON file."""
    async def all_of(model, *where):
        return [_row(r) for r in (await db.execute(select(model).where(*where))).scalars()]

    member_of = select(BusinessMember.business_id).where(BusinessMember.user_id == user.id)
    data = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "account": _row(user),
        "profile": _row(user.profile),
        "work_items": await all_of(WorkItem, WorkItem.user_id == user.id),
        "history": await all_of(WorkEvent, WorkEvent.user_id == user.id),
        "roles": await all_of(Role, Role.user_id == user.id),
        "business_pages": await all_of(Business, Business.id.in_(member_of)),
        "following": await all_of(Follow, Follow.follower_id == user.id),
        "watching": await all_of(Watch, Watch.user_id == user.id),
        "files": await all_of(Upload, Upload.owner_id == user.id),
    }
    name = f"proofolio-{user.profile.username}-{date.today().isoformat()}.json"
    return JSONResponse(data, headers={"Content-Disposition": f'attachment; filename="{name}"'})


# ---------- delete account ----------

class DeleteAccount(BaseModel):
    password: str
    confirm: str


@router.post("/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(payload: DeleteAccount, response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    _check_password(user, payload.password)
    if payload.confirm.strip() != "DELETE":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, 'Type DELETE to confirm')

    # BR-11: never leave a business without an Owner.
    owned = (await db.execute(
        select(Business.id, Business.name)
        .join(BusinessMember, BusinessMember.business_id == Business.id)
        .where(BusinessMember.user_id == user.id, BusinessMember.permission == "owner")
    )).all()
    for business_id, name in owned:
        others = await db.scalar(
            select(func.count()).select_from(BusinessMember).where(
                BusinessMember.business_id == business_id, BusinessMember.permission == "owner", BusinessMember.user_id != user.id
            )
        )
        if not others:
            raise HTTPException(status.HTTP_409_CONFLICT, f"You're the only owner of {name}. Add another owner or delete that page first.")

    files = (await db.execute(select(Upload.name).where(Upload.owner_id == user.id))).scalars().all()
    await db.execute(delete(User).where(User.id == user.id))  # FKs cascade the rest
    await db.commit()
    for name in files:
        (UPLOAD_DIR / name).unlink(missing_ok=True)
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
