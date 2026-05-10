from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


MAX_LONG_TEXT = 8000
MAX_SHORT_TEXT = 1000


def clean_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


class StaffJournalBase(BaseModel):
    holding_today: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)
    practice_today: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)
    reflection_today: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)

    description: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)
    feelings: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)
    evaluation: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)
    analysis: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)
    conclusion: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)
    action_plan: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)

    playfulness: Optional[str] = Field(default=None, max_length=MAX_SHORT_TEXT)
    acceptance: Optional[str] = Field(default=None, max_length=MAX_SHORT_TEXT)
    curiosity: Optional[str] = Field(default=None, max_length=MAX_SHORT_TEXT)
    empathy: Optional[str] = Field(default=None, max_length=MAX_SHORT_TEXT)

    leadership_style: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)
    leadership_reflection: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)

    child_impact: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)
    team_impact: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)
    safeguarding_considerations: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)
    support_needed: Optional[str] = Field(default=None, max_length=MAX_LONG_TEXT)

    @field_validator("*", mode="before")
    @classmethod
    def clean_text_fields(cls, value):
        return clean_optional_text(value)


class StaffJournalCreate(StaffJournalBase):
    pass


class StaffJournalUpdate(StaffJournalBase):
    pass


class StaffJournalRead(StaffJournalBase):
    id: int
    staff_id: Optional[int] = None
    user_id: Optional[int] = None
    home_id: Optional[int] = None
    young_person_id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)