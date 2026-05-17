from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from schemas.operational_state import OPERATIONAL_STATE_SCHEMA_VERSION

MissingEpisodeLifecycleState = Literal[
    "reported_missing",
    "police_notified",
    "return_pending",
    "returned",
    "RHI_required",
    "RHI_completed",
    "closed",
]

MissingEpisodeChronologyEvent = Literal[
    "missing_reported",
    "police_notified",
    "returned_home",
    "return_home_interview_completed",
    "safeguarding_escalation",
    "repeated_pattern_detected",
]

MissingEpisodeQueueCategory = Literal[
    "active_missing_episodes",
    "overdue_RHI",
    "repeated_missing_patterns",
    "safeguarding_escalation",
    "unresolved_follow_up",
]


def _clean_strings(values: list[str]) -> list[str]:
    return list(dict.fromkeys(str(value).strip() for value in values if str(value).strip()))


class MissingEpisodeVersionedDTO(BaseModel):
    schema_version: str = OPERATIONAL_STATE_SCHEMA_VERSION


class MissingEpisodeCreateRequest(BaseModel):
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    missing_from: str
    last_seen_location: str | None = None
    circumstances: str = Field(min_length=1)
    risk_level: Literal["low", "medium", "high", "critical"] = "high"
    police_reference: str | None = None
    police_notified_at: str | None = None
    safeguarding_link_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    follow_up_action_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    _clean_lists = field_validator("safeguarding_link_ids", "evidence_ids", "follow_up_action_ids")(_clean_strings)


class MissingEpisodeTransitionRequest(BaseModel):
    lifecycle_state: MissingEpisodeLifecycleState | None = None
    returned_at: str | None = None
    police_notified_at: str | None = None
    police_reference: str | None = None
    notes: str | None = None
    return_home_interview_due_at: str | None = None
    return_home_interview_completed_at: str | None = None
    safeguarding_link_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    follow_up_action_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    _clean_lists = field_validator("safeguarding_link_ids", "evidence_ids", "follow_up_action_ids")(_clean_strings)


class MissingEpisodeRecord(MissingEpisodeVersionedDTO):
    id: str
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    lifecycle_state: MissingEpisodeLifecycleState
    missing_from: str
    returned_at: str | None = None
    return_home_interview_due_at: str | None = None
    return_home_interview_completed_at: str | None = None
    last_seen_location: str | None = None
    circumstances: str
    risk_level: str = "high"
    police_reference: str | None = None
    police_notified_at: str | None = None
    safeguarding_link_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    follow_up_action_ids: list[str] = Field(default_factory=list)
    chronology_event_ids: list[str] = Field(default_factory=list)
    replay_event_ids: list[str] = Field(default_factory=list)
    created_by: int | None = None
    updated_by: int | None = None
    created_at: str | None = None
    updated_at: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    _clean_lists = field_validator(
        "safeguarding_link_ids",
        "evidence_ids",
        "follow_up_action_ids",
        "chronology_event_ids",
        "replay_event_ids",
    )(_clean_strings)


class MissingEpisodeQueueItem(MissingEpisodeVersionedDTO):
    queue_id: str
    category: MissingEpisodeQueueCategory
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    missing_episode_id: str
    title: str
    reason: str
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    lifecycle_state: MissingEpisodeLifecycleState
    chronology_links: list[str] = Field(default_factory=list)
    evidence_links: list[str] = Field(default_factory=list)

    _clean_lists = field_validator("chronology_links", "evidence_links")(_clean_strings)


class MissingEpisodeListResponse(MissingEpisodeVersionedDTO):
    ok: bool = True
    items: list[MissingEpisodeRecord] = Field(default_factory=list)
    total: int = 0


class MissingEpisodeQueueResponse(MissingEpisodeVersionedDTO):
    ok: bool = True
    summary: dict[MissingEpisodeQueueCategory, int] = Field(default_factory=dict)
    queues: dict[MissingEpisodeQueueCategory, list[MissingEpisodeQueueItem]] = Field(default_factory=dict)
