from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from schemas.operational_state import OPERATIONAL_STATE_SCHEMA_VERSION

ReturnHomeInterviewLifecycleState = Literal["draft", "completed", "manager_review", "linked_to_safeguarding", "archived"]


def _clean_strings(values: list[str]) -> list[str]:
    return list(dict.fromkeys(str(value).strip() for value in values if str(value).strip()))


class ReturnHomeInterviewVersionedDTO(BaseModel):
    schema_version: str = OPERATIONAL_STATE_SCHEMA_VERSION


class ReturnHomeInterviewCreateRequest(BaseModel):
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    missing_episode_id: str = ""
    interview_at: str
    child_voice: str = Field(min_length=1)
    push_factors: str | None = None
    pull_factors: str | None = None
    what_helped: str | None = None
    follow_up_required: str | None = None
    lifecycle_state: ReturnHomeInterviewLifecycleState = "completed"
    safeguarding_link_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    _clean_lists = field_validator("safeguarding_link_ids", "evidence_ids")(_clean_strings)


class ReturnHomeInterviewRecord(ReturnHomeInterviewVersionedDTO):
    id: str
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    missing_episode_id: str
    lifecycle_state: ReturnHomeInterviewLifecycleState
    interview_at: str
    child_voice: str
    push_factors: str | None = None
    pull_factors: str | None = None
    what_helped: str | None = None
    follow_up_required: str | None = None
    safeguarding_link_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    chronology_event_ids: list[str] = Field(default_factory=list)
    replay_event_ids: list[str] = Field(default_factory=list)
    created_by: int | None = None
    created_at: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    _clean_lists = field_validator(
        "safeguarding_link_ids",
        "evidence_ids",
        "chronology_event_ids",
        "replay_event_ids",
    )(_clean_strings)
