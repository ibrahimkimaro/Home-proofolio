import uuid
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_user
from app.core.database import get_db
from app.core.files import sign
from app.models.discussion import Discussion, DiscussionReply, DiscussionVote
from app.models.profile import Profile
from app.models.user import User
from app.services.activity import notify

router = APIRouter(prefix="/discussions", tags=["discussions"])

CATEGORY_LABELS = {
    "tech": "Engineering",
    "design": "Design",
    "health": "Health & Pharma",
    "sports": "Sports",
    "general": "General",
}


class ThreadCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    content: str = Field(min_length=5, max_length=15000)
    category: Literal["tech", "design", "health", "sports", "general"] = "general"
    access_type: Literal["open", "invited"] = "open"
    invited_users: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class ReplyCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


def _author_dict(user: User, profile: Profile | None) -> dict:
    name = (profile.display_name if profile and profile.display_name else user.fullname) or user.username
    role = (profile.headline if profile and profile.headline else "Proofolio Member")
    avatar = sign(profile.avatar_url) if profile and profile.avatar_url else None
    return {
        "id": str(user.id),
        "username": user.username,
        "name": name,
        "role": role,
        "avatar": avatar,
    }


def _thread_out(disc: Discussion, author_info: dict, upvotes: int, replies: int, has_voted: bool = False, replies_list: list = None) -> dict:
    return {
        "id": str(disc.id),
        "title": disc.title,
        "content": disc.content,
        "category": disc.category,
        "categoryLabel": CATEGORY_LABELS.get(disc.category, "General"),
        "accessType": disc.access_type,
        "invitedUsers": disc.invited_users,
        "author": author_info,
        "upvotes": upvotes,
        "replies": replies,
        "hasVoted": has_voted,
        "tags": disc.tags,
        "createdAt": disc.created_at.isoformat(),
        "updatedAt": disc.updated_at.isoformat(),
        "repliesList": replies_list or [],
    }


@router.get("")
async def list_discussions(
    category: str | None = Query(None),
    access_type: str | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    viewer: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """List discussion threads with filters."""
    stmt = (
        select(Discussion, User, Profile)
        .join(User, User.id == Discussion.user_id)
        .outerjoin(Profile, Profile.user_id == User.id)
    )

    # Visibility filter
    if viewer:
        viewer_ident = [viewer.username.lower(), viewer.email.lower()]
        # If open OR authored by viewer OR viewer in invited_users
        stmt = stmt.where(
            or_(
                Discussion.access_type == "open",
                Discussion.user_id == viewer.id,
                Discussion.invited_users.has_any(viewer_ident),
            )
        )
    else:
        stmt = stmt.where(Discussion.access_type == "open")

    if category and category != "all":
        stmt = stmt.where(Discussion.category == category)

    if access_type and access_type != "all":
        stmt = stmt.where(Discussion.access_type == access_type)

    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Discussion.title.ilike(term),
                Discussion.content.ilike(term),
                User.username.ilike(term),
                User.fullname.ilike(term),
            )
        )

    stmt = stmt.order_by(Discussion.created_at.desc()).offset(offset).limit(limit)
    rows = (await db.execute(stmt)).all()

    if not rows:
        return []

    disc_ids = [d.id for d, _, _ in rows]

    # Pre-fetch upvote counts
    vote_counts_stmt = (
        select(DiscussionVote.discussion_id, func.count(DiscussionVote.id))
        .where(DiscussionVote.discussion_id.in_(disc_ids))
        .group_by(DiscussionVote.discussion_id)
    )
    vote_counts = dict((await db.execute(vote_counts_stmt)).all())

    # Pre-fetch reply counts
    reply_counts_stmt = (
        select(DiscussionReply.discussion_id, func.count(DiscussionReply.id))
        .where(DiscussionReply.discussion_id.in_(disc_ids))
        .group_by(DiscussionReply.discussion_id)
    )
    reply_counts = dict((await db.execute(reply_counts_stmt)).all())

    # User upvotes
    user_votes = set()
    if viewer:
        uv_stmt = select(DiscussionVote.discussion_id).where(
            DiscussionVote.discussion_id.in_(disc_ids),
            DiscussionVote.user_id == viewer.id,
        )
        user_votes = set(await db.scalars(uv_stmt))

    results = []
    for disc, usr, prof in rows:
        auth_dict = _author_dict(usr, prof)
        uv = vote_counts.get(disc.id, 0)
        rc = reply_counts.get(disc.id, 0)
        hv = disc.id in user_votes
        results.append(_thread_out(disc, auth_dict, uv, rc, has_voted=hv))

    return results


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_discussion(
    body: ThreadCreate,
    viewer: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new discussion thread."""
    cleaned_tags = [t.strip() for t in body.tags if t.strip()]
    cleaned_invited = [u.strip().lower() for u in body.invited_users if u.strip()]

    disc = Discussion(
        id=uuid.uuid4(),
        user_id=viewer.id,
        title=body.title.strip(),
        content=body.content.strip(),
        category=body.category,
        access_type=body.access_type,
        invited_users=cleaned_invited,
        tags=cleaned_tags,
    )
    db.add(disc)
    await db.flush()

    # Automatically add author's vote
    author_vote = DiscussionVote(
        id=uuid.uuid4(),
        discussion_id=disc.id,
        user_id=viewer.id,
    )
    db.add(author_vote)

    # Notify invited users if any
    if cleaned_invited:
        invited_users = (
            await db.scalars(
                select(User).where(
                    or_(
                        func.lower(User.username).in_(cleaned_invited),
                        func.lower(User.email).in_(cleaned_invited),
                    )
                )
            )
        ).all()
        author_name = viewer.profile.display_name if viewer.profile and viewer.profile.display_name else viewer.fullname
        for target in invited_users:
            if target.id != viewer.id:
                notify(
                    db,
                    target.id,
                    "invite",
                    f"{author_name} invited you to discussion: {disc.title[:45]}",
                    None,
                    f"/discussions?thread={disc.id}",
                )

    await db.commit()
    await db.refresh(disc)

    prof = await db.scalar(select(Profile).where(Profile.user_id == viewer.id))
    auth_dict = _author_dict(viewer, prof)
    return _thread_out(disc, auth_dict, upvotes=1, replies=0, has_voted=True)


@router.get("/{discussion_id}")
async def get_discussion(
    discussion_id: uuid.UUID,
    viewer: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single discussion with full replies."""
    row = (
        await db.execute(
            select(Discussion, User, Profile)
            .join(User, User.id == Discussion.user_id)
            .outerjoin(Profile, Profile.user_id == User.id)
            .where(Discussion.id == discussion_id)
        )
    ).first()

    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Discussion not found")

    disc, usr, prof = row

    if disc.access_type == "invited":
        if not viewer:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This discussion is by invitation only.")
        viewer_ident = [viewer.username.lower(), viewer.email.lower()]
        if disc.user_id != viewer.id and not any(ident in disc.invited_users for ident in viewer_ident):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You have not been invited to this discussion.")

    # Replies
    replies_stmt = (
        select(DiscussionReply, User, Profile)
        .join(User, User.id == DiscussionReply.user_id)
        .outerjoin(Profile, Profile.user_id == User.id)
        .where(DiscussionReply.discussion_id == discussion_id)
        .order_by(DiscussionReply.created_at.asc())
    )
    rep_rows = (await db.execute(replies_stmt)).all()

    replies_list = []
    for r, r_usr, r_prof in rep_rows:
        r_auth = _author_dict(r_usr, r_prof)
        replies_list.append({
            "id": str(r.id),
            "text": r.content,
            "author": r_auth["name"],
            "role": r_auth["role"],
            "avatar": r_auth["avatar"],
            "username": r_auth["username"],
            "userId": r_auth["id"],
            "time": r.created_at.isoformat(),
        })

    upvotes = await db.scalar(select(func.count(DiscussionVote.id)).where(DiscussionVote.discussion_id == discussion_id)) or 0
    has_voted = False
    if viewer:
        has_voted = bool(
            await db.scalar(
                select(DiscussionVote.id).where(
                    DiscussionVote.discussion_id == discussion_id,
                    DiscussionVote.user_id == viewer.id,
                )
            )
        )

    auth_dict = _author_dict(usr, prof)
    return _thread_out(disc, auth_dict, upvotes, len(replies_list), has_voted, replies_list)


@router.post("/{discussion_id}/replies", status_code=status.HTTP_201_CREATED)
async def create_reply(
    discussion_id: uuid.UUID,
    body: ReplyCreate,
    viewer: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Post a reply to a discussion thread."""
    disc = await db.get(Discussion, discussion_id)
    if not disc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Discussion not found")

    if disc.access_type == "invited":
        viewer_ident = [viewer.username.lower(), viewer.email.lower()]
        if disc.user_id != viewer.id and not any(ident in disc.invited_users for ident in viewer_ident):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You have not been invited to this discussion.")

    reply = DiscussionReply(
        id=uuid.uuid4(),
        discussion_id=discussion_id,
        user_id=viewer.id,
        content=body.content.strip(),
    )
    db.add(reply)
    disc.updated_at = func.now()

    # Notify discussion author if someone else replied
    if disc.user_id != viewer.id:
        author_name = viewer.profile.display_name if viewer.profile and viewer.profile.display_name else viewer.fullname
        notify(
            db,
            disc.user_id,
            "comment",
            f"{author_name} replied to your discussion: {disc.title[:45]}",
            body.content.strip()[:120],
            f"/discussions?thread={disc.id}",
        )

    await db.commit()
    await db.refresh(reply)

    prof = await db.scalar(select(Profile).where(Profile.user_id == viewer.id))
    auth_info = _author_dict(viewer, prof)

    return {
        "id": str(reply.id),
        "text": reply.content,
        "author": auth_info["name"],
        "role": auth_info["role"],
        "avatar": auth_info["avatar"],
        "username": auth_info["username"],
        "userId": auth_info["id"],
        "time": reply.created_at.isoformat(),
    }


@router.post("/{discussion_id}/vote")
async def toggle_vote(
    discussion_id: uuid.UUID,
    viewer: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle upvote on a discussion."""
    disc = await db.get(Discussion, discussion_id)
    if not disc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Discussion not found")

    existing = await db.scalar(
        select(DiscussionVote).where(
            DiscussionVote.discussion_id == discussion_id,
            DiscussionVote.user_id == viewer.id,
        )
    )

    if existing:
        await db.delete(existing)
        has_voted = False
    else:
        new_vote = DiscussionVote(
            id=uuid.uuid4(),
            discussion_id=discussion_id,
            user_id=viewer.id,
        )
        db.add(new_vote)
        has_voted = True

    await db.commit()
    upvotes = await db.scalar(select(func.count(DiscussionVote.id)).where(DiscussionVote.discussion_id == discussion_id)) or 0
    return {"upvotes": upvotes, "hasVoted": has_voted}


@router.delete("/{discussion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_discussion(
    discussion_id: uuid.UUID,
    viewer: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a discussion thread."""
    disc = await db.get(Discussion, discussion_id)
    if not disc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Discussion not found")

    if disc.user_id != viewer.id and not viewer.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to delete this discussion")

    await db.delete(disc)
    await db.commit()
