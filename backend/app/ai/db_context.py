import uuid
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business import Role
from app.models.cv import Cv
from app.models.memory import Memory
from app.models.profile import Profile
from app.models.user import User
from app.models.work import WorkItem

RECENT_LIMIT = 10  # sliding window: keep the prompt small however much data the user has


async def user_profile_data(db: AsyncSession, user_id) -> dict:
    """The user's full account and profile details from the database.
    STRICTLY EXCLUDES passwords/password hashes for security.
    """
    uid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
    u = await db.scalar(select(User).where(User.id == uid))
    p = await db.scalar(select(Profile).where(Profile.user_id == uid))
    roles = (
        await db.scalars(
            select(Role).where(Role.user_id == uid).order_by(Role.created_at.desc())
        )
    ).all()
    cv = await db.scalar(select(Cv).where(Cv.user_id == uid))
    mem_count = await db.scalar(
        select(func.count(Memory.id)).where(Memory.user_id == uid)
    )

    if not u:
        return {}

    data = {
        "id": str(u.id),
        "fullname": u.fullname,
        "username": u.username,
        "email": u.email,
        "phone_number": u.phone_number or "Not specified",
        "is_admin": u.is_admin,
        "is_active": u.is_active,
        "member_since": u.created_at.strftime("%B %d, %Y") if u.created_at else None,
        "display_name": (p.display_name if p and p.display_name else u.fullname),
        "headline": (p.headline if p else None) or "Proofolio Member",
        "bio": (p.bio if p else None) or "",
        "visibility": (p.visibility.value if p else "public"),
        "roles": [
            {
                "title": r.title,
                "organization": r.organization_name or "Independent",
                "start_date": r.start_date.isoformat() if r.start_date else None,
                "end_date": r.end_date.isoformat() if r.end_date else None,
                "trust": r.trust,
            }
            for r in roles
        ],
        "memories_count": int(mem_count or 0),
    }

    if p and p.portfolio:
        data["portfolio"] = p.portfolio

    if cv and cv.data:
        data["cv"] = {
            "summary": cv.data.get("summary"),
            "skills": cv.data.get("skills", []),
            "education": cv.data.get("education", []),
            "languages": cv.data.get("languages", []),
            "referees": cv.data.get("referees", []),
            "signed": bool(cv.signed_at),
        }

    return data


async def user_profile_context(db: AsyncSession, user_id) -> str:
    """Formatted text representation of the user's profile and account for AI context."""
    data = await user_profile_data(db, user_id)
    if not data:
        return "User profile information is not available."

    lines = [
        f"## Member Profile Details (Verified Account Database)",
        f"- Full Name: {data.get('fullname')}",
        f"- Display Name: {data.get('display_name')}",
        f"- Username: @{data.get('username')}",
        f"- Email: {data.get('email')}",
        f"- Phone Number: {data.get('phone_number')}",
        f"- Professional Headline: {data.get('headline')}",
    ]
    if data.get("bio"):
        lines.append(f"- Biography: {data.get('bio')}")
    if data.get("member_since"):
        lines.append(f"- Member Since: {data.get('member_since')}")

    roles = data.get("roles", [])
    if roles:
        role_lines = [
            f"  * {r['title']} at {r['organization']} ({r['trust']})"
            for r in roles
        ]
        lines.append("- Roles & Organizations:\n" + "\n".join(role_lines))
    else:
        lines.append("- Roles: None recorded yet")

    cv = data.get("cv")
    if cv:
        if cv.get("summary"):
            lines.append(f"- CV Career Summary: {cv.get('summary')}")
        if cv.get("skills"):
            lines.append(f"- Core Skills: {', '.join(cv.get('skills'))}")
        if cv.get("education"):
            edu_strs = [
                f"{e.get('degree', '').strip()} at {e.get('institution', '').strip()}".strip(" at ")
                for e in cv.get("education", [])
                if (e.get('degree') or e.get('institution'))
            ]
            if edu_strs:
                lines.append(f"- Education: {'; '.join(edu_strs)}")

    return "\n".join(lines)


async def work_breakdown(db: AsyncSession, user_id) -> tuple[dict[str, int], dict[str, int]]:
    """({status: count}, {work_type: count}) for the user's own work items."""
    out = []
    for col in (WorkItem.status, WorkItem.work_type):
        rows = await db.execute(
            select(col, func.count())
            .where(WorkItem.user_id == user_id)
            .group_by(col)
            .order_by(func.count().desc())
        )
        out.append({k: n for k, n in rows.all()})
    return out[0], out[1]


async def recent_work(db: AsyncSession, user_id, limit: int = RECENT_LIMIT):
    return (
        await db.execute(
            select(
                WorkItem.title,
                WorkItem.work_type,
                WorkItem.status,
                WorkItem.occurred_on,
                WorkItem.skills,
            )
            .where(WorkItem.user_id == user_id)
            .order_by(WorkItem.created_at.desc())
            .limit(limit)
        )
    ).all()


async def user_work_context(db: AsyncSession, user_id) -> str:
    """The user's own work items as plain text. Scoped to user_id, read-only."""
    by_status, by_type = await work_breakdown(db, user_id)
    rows = await recent_work(db, user_id)
    lines = [
        f"- {t} [type: {k}, status: {s}{', date: ' + str(d) if d else ''}{', skills: ' + ', '.join(sk) if sk else ''}]"
        for t, k, s, d, sk in rows
    ]
    return (
        f"The user has {sum(by_status.values())} work items. By status: {by_status}. By type: {by_type}.\n"
        f"Most recent {len(rows)}:\n" + "\n".join(lines)
    )


async def user_messages_context(db: AsyncSession, user_id) -> str:
    """Summary of user's chat messages and conversations."""
    from app.models.chat import ChatMessage
    sent_count = await db.scalar(select(func.count(ChatMessage.id)).where(ChatMessage.author_id == user_id, ChatMessage.deleted_at.is_(None))) or 0
    rec_count = await db.scalar(select(func.count(ChatMessage.id)).where(ChatMessage.recipient_id == user_id, ChatMessage.deleted_at.is_(None))) or 0
    unread_count = await db.scalar(select(func.count(ChatMessage.id)).where(ChatMessage.recipient_id == user_id, ChatMessage.read_at.is_(None), ChatMessage.deleted_at.is_(None))) or 0
    recent = (await db.scalars(
        select(ChatMessage)
        .where(or_(ChatMessage.author_id == user_id, ChatMessage.recipient_id == user_id), ChatMessage.deleted_at.is_(None))
        .order_by(ChatMessage.inserted_at.desc())
        .limit(5)
    )).all()
    lines = [
        f"- {'[Sent by me]' if m.author_id == user_id else f'[From {m.author_name}]'}: {m.body[:150]}"
        for m in recent
    ]
    summary = f"Total messages: {sent_count} sent, {rec_count} received, {unread_count} unread."
    if lines:
        summary += "\nRecent messages:\n" + "\n".join(lines)
    return summary


async def user_full_database_summary(db: AsyncSession, user_id) -> str:
    """Complete summary of user's database records: profile, roles, work items, and messages."""
    prof = await user_profile_context(db, user_id)
    work = await user_work_context(db, user_id)
    msgs = await user_messages_context(db, user_id)
    return f"{prof}\n\n## Work & Portfolio Database Records\n{work}\n\n## Messages & Conversations\n{msgs}"
