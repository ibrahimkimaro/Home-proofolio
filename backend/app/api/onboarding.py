"""Public onboarding content (read by /start) and saving a new member's answers."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.profile import Profile
from app.models.platform import OnboardingAnswer, OnboardingCategory, OnboardingQuestion, OnboardingRole
from app.models.user import User
from app.services.platform import get_setting

router = APIRouter(tags=["onboarding"])


class CategoryOut(BaseModel):
    key: str
    label: str


class RoleOut(BaseModel):
    key: str
    label: str
    category_key: str
    template: str
    example_title: str
    example_skills: str
    evidence_hint: str


class QuestionOut(BaseModel):
    id: uuid.UUID
    prompt: str
    help: str | None
    kind: str
    options: list[str]
    required: bool


class OnboardingOut(BaseModel):
    steps: dict
    registration: dict
    categories: list[CategoryOut]
    roles: list[RoleOut]
    questions: list[QuestionOut]


@router.get("/onboarding", response_model=OnboardingOut)
async def get_onboarding(db: AsyncSession = Depends(get_db)):
    """Everything /start needs, active items only, in admin-defined order."""
    cats = (await db.execute(select(OnboardingCategory).where(OnboardingCategory.active == True).order_by(OnboardingCategory.sort))).scalars().all()  # noqa: E712
    active = {c.key for c in cats}
    roles = (await db.execute(select(OnboardingRole).where(OnboardingRole.active == True).order_by(OnboardingRole.sort))).scalars().all()  # noqa: E712
    qs = (await db.execute(select(OnboardingQuestion).where(OnboardingQuestion.active == True).order_by(OnboardingQuestion.sort))).scalars().all()  # noqa: E712
    return OnboardingOut(
        steps=await get_setting(db, "onboarding"),
        registration=await get_setting(db, "registration"),
        categories=[CategoryOut(key=c.key, label=c.label) for c in cats],
        roles=[RoleOut.model_validate(r, from_attributes=True) for r in roles if r.category_key in active],
        questions=[QuestionOut.model_validate(q, from_attributes=True) for q in qs],
    )


class AnswersIn(BaseModel):
    discipline: str | None = None
    answers: dict[str, str | list[str]] = {}


@router.post("/me/onboarding", status_code=status.HTTP_204_NO_CONTENT)
async def save_onboarding_answers(payload: AnswersIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Store the discipline and custom-question answers, validated against the current questions."""
    qs = {str(q.id): q for q in (await db.execute(select(OnboardingQuestion).where(OnboardingQuestion.active == True))).scalars()}  # noqa: E712
    rows: dict[str, object] = {}
    if payload.discipline:
        if await db.get(OnboardingRole, payload.discipline) is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown discipline")
        rows["discipline"] = payload.discipline
    for qid, value in payload.answers.items():
        q = qs.get(qid)
        if q is None:
            continue  # question removed meanwhile: ignore rather than fail sign-up
        if q.kind == "text":
            if not isinstance(value, str) or len(value) > 500:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"“{q.prompt}” needs a short text answer")
            value = value.strip()
        elif q.kind == "single":
            if value not in q.options:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Pick one of the options for “{q.prompt}”")
        else:
            if not isinstance(value, list) or any(v not in q.options for v in value):
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Pick from the options for “{q.prompt}”")
        if value not in ("", []):
            rows[qid] = value
    missing = [q.prompt for qid, q in qs.items() if q.required and qid not in rows]
    if missing:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Please answer: {missing[0]}")
    if rows:
        await db.execute(delete(OnboardingAnswer).where(OnboardingAnswer.user_id == user.id, OnboardingAnswer.question_key.in_(rows)))
        db.add_all(OnboardingAnswer(user_id=user.id, question_key=k, answer={"value": v}) for k, v in rows.items())
        # The kind of work they picked is what the profile and CV lead with, unless they already wrote their own headline.
        if payload.discipline:
            role = await db.get(OnboardingRole, payload.discipline)
            profile = await db.scalar(select(Profile).where(Profile.user_id == user.id))
            if role and profile and not (profile.headline or "").strip():
                profile.headline = role.label
        await db.commit()


@router.get("/platform")
async def platform_status(db: AsyncSession = Depends(get_db)):
    """Public switches the UI reacts to: the announcement banner and whether sign-up is open."""
    ann = await get_setting(db, "announcement")
    reg = await get_setting(db, "registration")
    return {"announcement": ann if ann.get("active") and ann.get("text") else None, "registration": reg}
