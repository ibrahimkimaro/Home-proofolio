import uuid

from sqlalchemy import and_, select

from app.models.business import Business, Role
from app.models.profile import Profile, Visibility
from app.models.work import WorkItem


def profile_visible(profile: Profile | None) -> bool:
    """Return True if profile is public or unlisted."""
    return profile is not None and profile.visibility in (Visibility.PUBLIC, Visibility.UNLISTED)


def business_visible(business: Business | None) -> bool:
    """Return True if business is public or unlisted."""
    return business is not None and business.visibility in (Visibility.PUBLIC, Visibility.UNLISTED)


def link_visible_work(work_id: uuid.UUID):
    """Query for a work item accessible via link (public or unlisted, not capture draft)."""
    return select(WorkItem).where(
        WorkItem.id == work_id,
        WorkItem.visibility.in_((Visibility.PUBLIC, Visibility.UNLISTED)),
        WorkItem.work_type != "capture",
    )


def listed_works(user_id: uuid.UUID):
    """Query for public works to show on visitor profile."""
    return (
        select(WorkItem)
        .where(
            WorkItem.user_id == user_id,
            WorkItem.visibility == Visibility.PUBLIC,
            WorkItem.work_type != "capture",
        )
        .order_by(WorkItem.occurred_on.desc().nulls_last(), WorkItem.created_at.desc())
    )


def public_evidence(evidence_links: list[dict]) -> list[dict]:
    """Filter evidence links for visitor view: public links are preserved,

    'exists' keeps the record without the URL, and 'private' links are stripped.
    """
    out = []
    for e in evidence_links:
        vis = e.get("visibility", "public")
        if vis == "public":
            out.append(e)
        elif vis == "exists":
            item = dict(e)
            item["url"] = ""
            out.append(item)
    return out


def public_roles_filter():
    """SQLAlchemy filter expression for public profile roles."""
    return and_(Role.visibility == Visibility.PUBLIC, Role.hidden_by_business == False)  # noqa: E712


def team_roles_filter(business_id: uuid.UUID):
    """SQLAlchemy filter expression for roles shown on a public business page."""
    return and_(
        Role.business_id == business_id,
        Role.visibility == Visibility.PUBLIC,
        Role.hidden_by_business == False,  # noqa: E712
    )


def section_public(business: Business, section_name: str) -> bool:
    """Check if a specific section of a business page is visible to visitors."""
    if not business_visible(business):
        return False
    return (business.section_visibility or {}).get(section_name, "public") == "public"


def public_contact(business: Business) -> dict | None:
    """Return business contact dictionary with only owner-enabled fields."""
    contact: dict[str, str] = {}
    if business.show_phone and business.phone:
        contact["phone"] = business.phone
    if business.show_whatsapp and business.whatsapp:
        contact["whatsapp"] = business.whatsapp
    if business.show_email and business.email:
        contact["email"] = business.email
    if business.show_location and business.location:
        contact["location"] = business.location
    return contact or None
