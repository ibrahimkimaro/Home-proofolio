import uuid
from datetime import date, datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.profile import Visibility
from app.services.lifecycle import KINDS, check_state, first_state
from app.services.templates import EVIDENCE_TYPES

EvidenceType = Literal[EVIDENCE_TYPES]  # type: ignore[valid-type]


class EvidenceLink(BaseModel):
    label: str = Field(min_length=1, max_length=100)
    url: str = Field(min_length=1, max_length=1000)
    type: EvidenceType = "link"
    # public = follows the item; exists = visitors see that proof exists; private = hidden (FR-EVD-02).
    visibility: Literal["public", "exists", "private"] = "public"


class WorkCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    context_role: str | None = Field(default=None, max_length=200)
    occurred_on: date | None = None
    work_type: Literal[KINDS] = "capture"  # type: ignore[valid-type]
    status: str | None = None
    template: str | None = Field(default=None, max_length=50)
    visibility: Visibility = Visibility.PRIVATE  # BR-01
    skills: list[str] = Field(default_factory=list)
    custom_attributes: dict = Field(default_factory=dict)
    evidence_links: list[EvidenceLink] = Field(default_factory=list)


    @model_validator(mode="after")
    def state_fits_kind(self):
        self.status = self.status or first_state(self.work_type)
        check_state(self.work_type, self.status)
        if self.work_type == "capture" and self.visibility in (Visibility.PUBLIC, Visibility.UNLISTED):
            raise ValueError("Say what this is before publishing it")
        return self


class WorkUpdate(WorkCreate):
    pass


class WorkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    context_role: str | None
    occurred_on: date | None
    work_type: str
    status: str
    template: str | None = None
    source_id: uuid.UUID | None = None
    visibility: Visibility
    skills: list[str]
    custom_attributes: dict
    evidence_links: list[EvidenceLink]
    created_at: datetime
    updated_at: datetime
