import re
import uuid
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

Section = Literal["about", "experience", "works", "contact"]
ALL_SECTIONS: list[Section] = ["about", "experience", "works", "contact"]


Platform = Literal["instagram", "tiktok", "github", "facebook", "snapchat", "threads", "x", "telegram", "linkedin"]
_HANDLE = re.compile(r"^[A-Za-z0-9._-]{1,60}$")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


# Where each platform's links may point (and how a bare username becomes a link). Anything else is refused, so a
# "social link" can never send visitors to some other site.
_SITES: dict[str, tuple[tuple[str, ...], str]] = {
    "instagram": (("instagram.com", "instagr.am"), "https://www.instagram.com/{}"),
    "tiktok": (("tiktok.com",), "https://www.tiktok.com/@{}"),
    "github": (("github.com",), "https://github.com/{}"),
    "facebook": (("facebook.com", "fb.com", "fb.me"), "https://www.facebook.com/{}"),
    "snapchat": (("snapchat.com",), "https://www.snapchat.com/add/{}"),
    "threads": (("threads.net", "threads.com"), "https://www.threads.net/@{}"),
    "x": (("x.com", "twitter.com"), "https://x.com/{}"),
    "telegram": (("t.me", "telegram.me", "telegram.org"), "https://t.me/{}"),
    "linkedin": (("linkedin.com", "lnkd.in"), "https://www.linkedin.com/in/{}"),
}
_MD_LINK = re.compile(r"\]\((https?://[^)\s]+)\)")


class SocialLink(BaseModel):
    """A social profile. Stored as its full https link: the member can paste the link (share links and QR links work) or
    just a username. The link must belong to that platform; tracking parts (?utm=...) are dropped."""

    platform: Platform
    handle: str  # becomes the normalised https link

    @model_validator(mode="after")
    def to_link(self):
        hosts, template = _SITES[self.platform]
        v = self.handle.strip()
        if m := _MD_LINK.search(v):  # pasted from a chat or notes as [text](link)
            v = m.group(1)
        if not v.lower().startswith(("http://", "https://")) and ("/" in v or "." in v.split("?")[0]) and not _HANDLE.match(v.lstrip("@")):
            v = "https://" + v.lstrip("/")  # www.tiktok.com/@name
        if v.lower().startswith(("http://", "https://")):
            u = urlparse(v)
            host = (u.hostname or "").lower()
            if not any(host == h or host.endswith("." + h) for h in hosts):
                raise ValueError(f"That link isn't a {self.platform.title()} link")
            path = "/".join(p for p in u.path.split("/") if p)
            if not path:
                raise ValueError("Paste the link to your profile, not the home page")
            if not re.fullmatch(r"[A-Za-z0-9@._~%+\-/]{1,200}", path):
                raise ValueError("That link has characters we can't use")
            self.handle = f"https://{host}/{path}"
        else:
            name = v.lstrip("@").strip()
            if not _HANDLE.match(name):
                raise ValueError("Paste your profile link, or just your username")
            self.handle = template.format(name)
        return self


class ContactItem(BaseModel):
    """An extra way to reach the member: another email, a phone number or a WhatsApp number."""

    kind: Literal["email", "phone", "whatsapp"]
    value: str = Field(max_length=120)
    label: str | None = Field(default=None, max_length=30)

    @field_validator("label")
    @classmethod
    def clean_label(cls, v: str | None) -> str | None:
        v = " ".join((v or "").split())
        return v or None

    @model_validator(mode="after")
    def check_value(self):
        v = self.value.strip()
        if self.kind == "email":
            if not _EMAIL.match(v):
                raise ValueError("That email address doesn't look right")
            self.value = v.lower()
        else:
            digits = re.sub(r"\D", "", v)
            if not re.fullmatch(r"\+?[0-9 ()\-.]{6,25}", v) or not 7 <= len(digits) <= 15:
                raise ValueError("Enter a phone number with the country code, e.g. +255 712 345 678")
            self.value = v
        return self


class PortfolioSettings(BaseModel):
    """How the public portfolio is laid out. Stored as profiles.portfolio (JSONB)."""

    tagline: str | None = Field(default=None, max_length=200)  # hero statement
    roles: list[str] = Field(default_factory=list, max_length=6)  # rotating identity titles
    sections: list[Section] = Field(default_factory=lambda: list(ALL_SECTIONS))  # order = display order
    featured: list[uuid.UUID] = Field(default_factory=list, max_length=6)  # pinned first in Works
    show_metrics: bool = True
    contact_email: EmailStr | None = None  # shown only when set (opt-in)
    contacts: list[ContactItem] = Field(default_factory=list, max_length=10)  # more emails, phones, WhatsApp
    socials: list[SocialLink] = Field(default_factory=list, max_length=12)  # one per platform

    @field_validator("roles")
    @classmethod
    def clean_roles(cls, v: list[str]) -> list[str]:
        out = [r.strip() for r in v if r.strip()]
        if any(len(r) > 60 for r in out):
            raise ValueError("Each role can be at most 60 characters")
        return list(dict.fromkeys(out))

    @field_validator("socials")
    @classmethod
    def one_per_platform(cls, v: list[SocialLink]) -> list[SocialLink]:
        seen: dict[str, SocialLink] = {}
        for item in v:
            seen[item.platform] = item
        return list(seen.values())

    @field_validator("contacts")
    @classmethod
    def unique_contacts(cls, v: list[ContactItem]) -> list[ContactItem]:
        seen: dict[tuple[str, str], ContactItem] = {}
        for item in v:
            seen[(item.kind, item.value)] = item
        return list(seen.values())

    @field_validator("sections")
    @classmethod
    def unique_sections(cls, v: list[Section]) -> list[Section]:
        return list(dict.fromkeys(v))


def load(raw: dict | None) -> PortfolioSettings:
    """Stored JSON -> settings; tolerant of older or partial documents."""
    try:
        return PortfolioSettings.model_validate(raw or {})
    except ValueError:
        return PortfolioSettings()
