import uuid
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

Section = Literal["about", "experience", "works", "contact"]
ALL_SECTIONS: list[Section] = ["about", "experience", "works", "contact"]


class PortfolioSettings(BaseModel):
    """How the public portfolio is laid out. Stored as profiles.portfolio (JSONB)."""

    tagline: str | None = Field(default=None, max_length=200)  # hero statement
    roles: list[str] = Field(default_factory=list, max_length=6)  # rotating identity titles
    sections: list[Section] = Field(default_factory=lambda: list(ALL_SECTIONS))  # order = display order
    featured: list[uuid.UUID] = Field(default_factory=list, max_length=6)  # pinned first in Works
    show_metrics: bool = True
    contact_email: EmailStr | None = None  # shown only when set (opt-in)

    @field_validator("roles")
    @classmethod
    def clean_roles(cls, v: list[str]) -> list[str]:
        out = [r.strip() for r in v if r.strip()]
        if any(len(r) > 60 for r in out):
            raise ValueError("Each role can be at most 60 characters")
        return list(dict.fromkeys(out))

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
