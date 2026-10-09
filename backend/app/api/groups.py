"""Group chats: the creator is the admin, invited members accept or decline from their notifications.

Everything is stored first (membership, notifications, "X joined" lines in the chat history), so a
member who is offline sees it all later. After the commit, open apps get it live through
realtime_chat (app/services/realtime.py): the invite pop-up, the new line in the room, and the
removed member losing the room immediately.
"""
import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.uploads import IMAGES, save_upload
from app.core.database import get_db
from app.core.files import sign
from app.models.activity import Notification
from app.models.chat import ChatGroup, ChatGroupMember
from app.models.profile import Profile
from app.models.user import User
from app.services import realtime
from app.services.activity import notify

router = APIRouter(prefix="/chat/groups", tags=["chat-groups"])

MAX_MEMBERS = 200


class GroupCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    topic: str = Field(default="", max_length=200)
    member_ids: list[uuid.UUID] = Field(default_factory=list, max_length=MAX_MEMBERS)


class AddMembers(BaseModel):
    user_ids: list[uuid.UUID] = Field(min_length=1, max_length=MAX_MEMBERS)


class RoleChange(BaseModel):
    role: str = Field(pattern="^(admin|member)$")


def _invite_link(group_id: uuid.UUID) -> str:
    return f"/chat?g={group_id}"


def _slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:50] or "group"
    return f"{base}-{uuid.uuid4().hex[:6]}"  # unique, and matches the chat server's [a-z0-9-]{1,64}


def _display(user: User, profile: Profile | None) -> str:
    return (profile.display_name if profile and profile.display_name else user.fullname) or user.username


async def _name_of(db: AsyncSession, user: User) -> str:
    return _display(user, await db.scalar(select(Profile).where(Profile.user_id == user.id)))


async def _group_and_me(db: AsyncSession, group_id: uuid.UUID, user: User) -> tuple[ChatGroup, ChatGroupMember]:
    group = await db.get(ChatGroup, group_id)
    me = await db.get(ChatGroupMember, (group_id, user.id)) if group else None
    if not group or not me:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")
    return group, me


async def _require_admin(db: AsyncSession, group_id: uuid.UUID, user: User) -> ChatGroup:
    group, me = await _group_and_me(db, group_id, user)
    if me.status != "member" or me.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only a group admin can do this")
    return group


async def _post_system(db: AsyncSession, group: ChatGroup, user: User, body: str) -> int:
    """A line in the group's history ("X joined the group"), stored like any other chat message.
    Its client_id starts with "sys-", which the chat shows as a centered notice. Returns its seq."""
    return (
        await db.execute(
            text(
                "INSERT INTO chat_messages (client_id, topic, author_id, author_name, author_username, body) "
                "VALUES (:cid, :topic, :uid, :name, :username, :body) RETURNING id"
            ),
            {
                "cid": f"sys-{uuid.uuid4().hex}",
                "topic": f"room:{group.slug}",
                "uid": user.id,
                "name": await _name_of(db, user),
                "username": user.username,
                "body": body,
            },
        )
    ).scalar_one()


async def _invite(db: AsyncSession, group: ChatGroup, inviter: User, inviter_name: str, user_ids: list[uuid.UUID]) -> list[uuid.UUID]:
    """Invite members (skipping guests, inactive accounts and people already in). Returns who was invited."""
    if not user_ids:
        return []
    wanted = {u for u in user_ids if u != inviter.id}
    users = (
        await db.execute(select(User).where(User.id.in_(wanted), User.is_active.is_(True), User.is_guest.is_(False)))
    ).scalars().all()
    invited = []
    for u in users:
        row = await db.get(ChatGroupMember, (group.id, u.id))
        if row and row.status in ("member", "invited"):
            continue
        if row:  # declined earlier, invite again
            row.status, row.invited_by = "invited", inviter.id
        else:
            db.add(ChatGroupMember(group_id=group.id, user_id=u.id, role="member", status="invited", invited_by=inviter.id))
        notify(
            db, u.id, "group_invite", f"{inviter_name} invited you to join \"{group.name}\"",
            group.topic or "Accept to join the group chat.", _invite_link(group.id),
        )
        invited.append(u.id)
    return invited


def _invite_pushes(group: ChatGroup, inviter_name: str, user_ids: list[uuid.UUID]) -> list[dict]:
    payload = {"group_id": str(group.id), "name": group.name, "topic": group.topic, "from": inviter_name}
    return [realtime.to_user(u, "group_invite", payload) for u in user_ids]


async def _contact(db: AsyncSession, group: ChatGroup, my_role: str, viewer_id: uuid.UUID | None = None) -> dict:
    topic = f"room:{group.slug}"
    last = (
        await db.execute(
            text(
                "SELECT CASE WHEN deleted_at IS NOT NULL THEN 'This message was deleted' ELSE body END, inserted_at FROM chat_messages "
                "WHERE topic = :t AND id > COALESCE((SELECT up_to FROM chat_clears WHERE user_id = :u AND topic = :t), 0) ORDER BY id DESC LIMIT 1"
            ),
            {"t": topic, "u": viewer_id},
        )
    ).first()
    count = (
        await db.execute(
            text("SELECT count(*) FROM chat_group_members WHERE group_id = :g AND status = 'member'"), {"g": group.id}
        )
    ).scalar()
    return {
        "id": str(group.id),
        "name": group.name,
        "username": group.slug,
        "role": group.topic or "Group chat",
        "avatar": sign(group.avatar_url) if group.avatar_url else None,
        "type": "group",
        "roomId": group.slug,
        "myRole": my_role,
        "membersCount": int(count or 0),
        "isOnline": False,
        "lastMessage": last[0] if last else None,
        "lastMessageTime": last[1].isoformat() if last else None,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_group(payload: GroupCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    name = await _name_of(db, user)
    group = ChatGroup(slug=_slugify(payload.name), name=payload.name.strip(), topic=payload.topic.strip(), created_by=user.id)
    db.add(group)
    await db.flush()
    db.add(ChatGroupMember(
        group_id=group.id, user_id=user.id, role="admin", status="member", invited_by=user.id,
        joined_at=datetime.now(timezone.utc),
    ))
    invited = await _invite(db, group, user, name, list(dict.fromkeys(payload.member_ids)))
    await _post_system(db, group, user, f"{name} created the group \"{group.name}\"")
    await db.commit()
    await realtime.push(_invite_pushes(group, name, invited))
    contact = await _contact(db, group, "admin")
    contact["invited"] = len(invited)
    return contact


@router.get("")
async def my_groups(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(ChatGroup, ChatGroupMember.role)
        .join(ChatGroupMember, ChatGroupMember.group_id == ChatGroup.id)
        .where(ChatGroupMember.user_id == user.id, ChatGroupMember.status == "member")
    )
    out = [await _contact(db, g, role, user.id) for g, role in rows.all()]
    out.sort(key=lambda c: c["lastMessageTime"] or "", reverse=True)
    return out


@router.get("/{group_id}")
async def group_detail(group_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group, me = await _group_and_me(db, group_id, user)
    if me.status == "declined":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")
    rows = await db.execute(
        select(ChatGroupMember, User, Profile)
        .join(User, User.id == ChatGroupMember.user_id)
        .outerjoin(Profile, Profile.user_id == User.id)
        .where(ChatGroupMember.group_id == group_id, ChatGroupMember.status.in_(("member", "invited")))
    )
    members = [
        {
            "user_id": str(u.id), "name": _display(u, p), "username": u.username,
            "role": m.role, "status": m.status, "is_me": u.id == user.id,
            "avatar": sign(p.avatar_url) if p and p.avatar_url else None,
        }
        for m, u, p in rows.all()
    ]
    # Admins first, then members, then people who haven't answered yet.
    members.sort(key=lambda m: (m["status"] != "member", m["role"] != "admin", m["name"].lower()))
    return {
        "id": str(group.id), "name": group.name, "topic": group.topic, "slug": group.slug,
        "avatar": sign(group.avatar_url) if group.avatar_url else None,
        "my_role": me.role, "my_status": me.status, "members": members,
    }


async def _close_invite(db: AsyncSession, user: User, group: ChatGroup, title: str) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.kind == "group_invite", Notification.link == _invite_link(group.id))
        .values(kind="group", title=title[:160], read_at=datetime.now(timezone.utc))
    )


@router.post("/{group_id}/accept")
async def accept_invite(group_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group, me = await _group_and_me(db, group_id, user)
    if me.status == "declined":
        raise HTTPException(status.HTTP_409_CONFLICT, "This invitation was declined")
    pushes = [realtime.to_user(user.id, "groups_changed")]  # my other tabs: list + bell
    if me.status == "invited":
        me.status, me.joined_at = "member", datetime.now(timezone.utc)
        name = await _name_of(db, user)
        seq = await _post_system(db, group, user, f"{name} joined the group. Welcome!")
        pushes.append(realtime.room_message(group.slug, seq))
        if me.invited_by and me.invited_by != user.id:
            notify(db, me.invited_by, "group", f"{name} joined \"{group.name}\"", None, f"/chat?c=room:{group.slug}")
            pushes.append(realtime.to_user(me.invited_by, "groups_changed"))
    await _close_invite(db, user, group, f"You joined \"{group.name}\"")
    await db.commit()
    await realtime.push(pushes)
    return {"slug": group.slug, "topic": f"room:{group.slug}", "group": await _contact(db, group, me.role)}


@router.post("/{group_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
async def decline_invite(group_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group, me = await _group_and_me(db, group_id, user)
    pushes = [realtime.to_user(user.id, "groups_changed")]
    if me.status == "invited":
        me.status = "declined"
        if me.invited_by and me.invited_by != user.id:
            notify(db, me.invited_by, "group", f"{await _name_of(db, user)} declined \"{group.name}\"")
            pushes.append(realtime.to_user(me.invited_by, "groups_changed"))
    await _close_invite(db, user, group, f"You declined \"{group.name}\"")
    await db.commit()
    await realtime.push(pushes)


@router.post("/{group_id}/members")
async def add_members(group_id: uuid.UUID, payload: AddMembers, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = await _require_admin(db, group_id, user)
    name = await _name_of(db, user)
    invited = await _invite(db, group, user, name, list(dict.fromkeys(payload.user_ids)))
    await db.commit()
    await realtime.push(_invite_pushes(group, name, invited))
    return {"invited": len(invited)}


@router.post("/{group_id}/members/{member_id}/role", status_code=status.HTTP_204_NO_CONTENT)
async def set_role(group_id: uuid.UUID, member_id: uuid.UUID, payload: RoleChange, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = await _require_admin(db, group_id, user)
    target = await db.get(ChatGroupMember, (group_id, member_id))
    if not target or target.status != "member":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    if target.role == payload.role:
        return
    if payload.role == "member":
        admins = (await db.execute(text("SELECT count(*) FROM chat_group_members WHERE group_id = :g AND role = 'admin' AND status = 'member'"), {"g": group_id})).scalar()
        if admins <= 1:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "A group needs at least one admin")
    target.role = payload.role
    target_user = await db.get(User, member_id)
    who, them = await _name_of(db, user), await _name_of(db, target_user)
    line = f"{who} made {them} an admin" if payload.role == "admin" else f"{who} removed {them} as admin"
    seq = await _post_system(db, group, user, line)
    await db.commit()
    await realtime.push([realtime.room_message(group.slug, seq), realtime.to_user(member_id, "groups_changed")])


@router.delete("/{group_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(group_id: uuid.UUID, member_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """An admin removes someone (or cancels an invite); anyone can remove themselves to leave."""
    group, me = await _group_and_me(db, group_id, user)
    leaving = member_id == user.id
    if not leaving and (me.status != "member" or me.role != "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only a group admin can remove members")
    target = me if leaving else await db.get(ChatGroupMember, (group_id, member_id))
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    was_member = target.status == "member"
    was_admin = target.role == "admin" and was_member
    target_user = await db.get(User, member_id)
    await db.delete(target)
    await db.flush()
    if was_admin:  # hand the group to the longest-standing member so it is never left without an admin
        left_admin = (await db.execute(text("SELECT count(*) FROM chat_group_members WHERE group_id = :g AND role = 'admin' AND status = 'member'"), {"g": group_id})).scalar()
        if not left_admin:
            heir = await db.scalar(
                select(ChatGroupMember).where(ChatGroupMember.group_id == group_id, ChatGroupMember.status == "member").order_by(ChatGroupMember.joined_at).limit(1)
            )
            if heir:
                heir.role = "admin"
    if not leaving and target.status == "invited":  # cancelled invite: drop the pending notification too
        await db.execute(
            update(Notification)
            .where(Notification.user_id == member_id, Notification.kind == "group_invite", Notification.link == _invite_link(group.id))
            .values(kind="group", title=f"The invitation to \"{group.name}\" was withdrawn"[:160], read_at=datetime.now(timezone.utc))
        )
    pushes = [realtime.member_removed(group.slug, member_id), realtime.to_user(member_id, "groups_changed")]
    if was_member:
        line = f"{await _name_of(db, user)} left the group" if leaving else f"{await _name_of(db, user)} removed {await _name_of(db, target_user)}"
        pushes.append(realtime.room_message(group.slug, await _post_system(db, group, user, line)))
    await db.commit()
    await realtime.push(pushes)


# ---- admin powers: rename, description, picture, delete the group ----

class GroupEdit(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    topic: str | None = Field(default=None, max_length=200)


async def _everyone(db: AsyncSession, group_id: uuid.UUID) -> list[uuid.UUID]:
    """Members and people still invited: all of them should see the group's list entry update."""
    return list(
        (
            await db.execute(select(ChatGroupMember.user_id).where(ChatGroupMember.group_id == group_id, ChatGroupMember.status.in_(("member", "invited"))))
        ).scalars()
    )


async def _announce(db: AsyncSession, group: ChatGroup, user: User, lines: list[str]) -> None:
    """Store a line for each change in the group's history, then tell everyone's open apps (after the commit)."""
    seqs = [await _post_system(db, group, user, line) for line in lines]
    members = await _everyone(db, group.id)
    await db.commit()
    await realtime.push([realtime.room_message(group.slug, q) for q in seqs] + [realtime.to_user(m, "groups_changed") for m in members])


@router.patch("/{group_id}")
async def edit_group(group_id: uuid.UUID, payload: GroupEdit, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Rename the group or change its description. Admins only. Each change appears in the chat as a line."""
    group = await _require_admin(db, group_id, user)
    who = await _name_of(db, user)
    lines = []
    if payload.name is not None and payload.name.strip() != group.name:
        new = payload.name.strip()
        if len(new) < 2:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The group needs a name")
        lines.append(f'{who} renamed the group from "{group.name}" to "{new}"')
        group.name = new
    if payload.topic is not None and payload.topic.strip() != group.topic:
        group.topic = payload.topic.strip()
        lines.append(f"{who} changed the group description")
    if lines:
        await _announce(db, group, user, lines)
    return await _contact(db, group, "admin", user.id)


@router.post("/{group_id}/avatar")
async def set_group_avatar(group_id: uuid.UUID, file: UploadFile, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Set the group's picture (an image). Admins only."""
    group = await _require_admin(db, group_id, user)
    group.avatar_url = await save_upload(db, user, file, IMAGES, public=True)
    await _announce(db, group, user, [f"{await _name_of(db, user)} changed the group picture"])
    return await _contact(db, group, "admin", user.id)


@router.delete("/{group_id}/avatar")
async def remove_group_avatar(group_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = await _require_admin(db, group_id, user)
    if group.avatar_url:
        group.avatar_url = None
        await _announce(db, group, user, [f"{await _name_of(db, user)} removed the group picture"])
    return await _contact(db, group, "admin", user.id)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(group_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Delete the group for everyone: its messages are removed and every member loses the room. Admins only."""
    group = await _require_admin(db, group_id, user)
    who = await _name_of(db, user)
    members = await _everyone(db, group_id)
    topic = f"room:{group.slug}"
    await db.execute(text("DELETE FROM chat_messages WHERE topic = :t"), {"t": topic})
    await db.execute(text("DELETE FROM chat_clears WHERE topic = :t"), {"t": topic})
    await db.execute(delete(Notification).where(Notification.kind == "group_invite", Notification.link == _invite_link(group_id)))
    for m in members:
        if m != user.id:
            notify(db, m, "group", f'"{group.name}" was deleted by {who}')
    slug = group.slug
    await db.delete(group)  # its members go with it
    await db.commit()
    pushes = [realtime.member_removed(slug, m) for m in members]  # closes the room if it's open
    pushes += [realtime.to_user(m, "groups_changed") for m in members] + [realtime.to_user(m, "notifications_changed") for m in members]
    await realtime.push(pushes)
