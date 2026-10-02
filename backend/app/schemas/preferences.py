import re
from typing import Literal

from pydantic import BaseModel, field_validator


class AppearancePrefs(BaseModel):
    """Mirrors home_profio_frontend/src/lib/appearance.ts."""

    theme: Literal["light", "dark", "system"] = "system"
    tone: Literal["neutral", "paper", "warm-paper", "slate", "olbongo", "espresso", "midnight"] = "neutral"
    accent: Literal["graphite", "brass", "emerald", "berry", "sky", "ocean", "forest", "cocoa", "plum", "clay", "custom"] = "graphite"
    custom: str = "#2563eb"
    glass: Literal["clean", "frosted", "liquid"] = "clean"
    text: Literal["small", "default", "large", "xlarge"] = "default"
    motion: Literal["system", "reduce"] = "system"
    contrast: Literal["default", "more"] = "default"

    @field_validator("custom")
    @classmethod
    def hex_color(cls, v: str) -> str:
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", v):
            raise ValueError("custom must be a #rrggbb color")
        return v.lower()


class Preferences(BaseModel):
    appearance: AppearancePrefs | None = None
