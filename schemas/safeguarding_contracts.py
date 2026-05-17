from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from schemas.operational_state import OPERATIONAL_STATE_SCHEMA_VERSION

SafeguardingLifecycleState = Literal[
    "draft",
    "submitted",
    "manager_review",
    "action_required",
    "escalated",
    "external_notification",
    "monitoring",
    "resolved",
    "archived",
]

SafeguardingChronologyEvent = Literal[
    "safeguarding_created",
    "safeguarding_reviewed",
    "safeguarding_action_added",
    "safeguarding_escalated",
    "safeguarding_resolved",
]

SafeguardingQueueCategory = Literal[
    "unresolved_safeguarding",
    "overdue_review",
    "child_voice_missing",
    "external_notification_pending",
    "unresolved_safeguarding_actions",
]


def _clean_strings(values: list[str]) -> list[str]:
    return list(dict.fromkeys(str(value).strip() for value in values if str(value).strip()))


class SafeguardingVersionedDTO(BaseModel):
    schema_version: str = OPERATIONAL_STATE_SCHEMA_VERSION


class SafeguardingCreateRequest(BaseModel):
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    title: str = Field(min_length=1, max_length=240)
    concern_summary: str = Field(min_length=1)
    concern_category: str = "safeguarding"
    lifecycle_state: SafeguardingLifecycleState = "draft"
    severity: Literal["low", "medium", "high", "critical"] = "high"
    child_voice: str | None = None
    immediate_actions: str | None = None
    external_notification_required: bool = False
    review_due_at: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)
    linked_action_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    _clean_lists = field_validator("evidence_ids", "linked_action_ids")(_clean_strings)


class SafeguardingTransitionRequest(BaseModel):
    lifecycle_state: SafeguardingLifecycleState | None = None
    notes: str | None = None
    review_due_at: str | None = None
    external_notification_required: bool | None = None
    external_notification_at: str | None = None
    child_voice: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)
    linked_action_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    _clean_lists = field_validator("evidence_ids", "linked_action_ids")(_clean_strings)


class SafeguardingActionRequest(BaseModel):
    action_summary: str = Field(min_length=1)
    owner_user_id: int | None = None
    due_at: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    _clean_lists = field_validator("evidence_ids")(_clean_strings)


class SafeguardingRecord(SafeguardingVersionedDTO):
    id: str
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    title: str
    concern_summary: str
    concern_category: str
    lifecycle_state: SafeguardingLifecycleState
    severity: str = "high"
    child_voice: str | None = None
    immediate_actions: str | None = None
    external_notification_required: bool = False
    external_notification_at: str | None = None
    review_due_at: str | None = None
    resolved_at: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)
    linked_action_ids: list[str] = Field(default_factory=list)
    chronology_event_ids: list[str] = Field(default_factory=list)
    replay_event_ids: list[str] = Field(default_factory=list)
    created_by: int | None = None
    updated_by: int | None = None
    created_at: str | None = None
    updated_at: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    _clean_lists = field_validator(
        "evidence_ids",
        "linked_action_ids",
        "chronology_event_ids",
        "replay_event_ids",
    )(_clean_strings)


class SafeguardingQueueItem(SafeguardingVersionedDTO):
    queue_id: str
    category: SafeguardingQueueCategory
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    safeguarding_id: str
    title: str
    reason: str
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    lifecycle_state: SafeguardingLifecycleState
    chronology_links: list[str] = Field(default_factory=list)
    evidence_links: list[str] = Field(default_factory=list)

    _clean_lists = field_validator("chronology_links", "evidence_links")(_clean_strings)


class SafeguardingListResponse(SafeguardingVersionedDTO):
    ok: bool = True
    items: list[SafeguardingRecord] = Field(default_factory=list)
    total: int = 0


class SafeguardingQueueResponse(SafeguardingVersionedDTO):
    ok: bool = True
    summary: dict[SafeguardingQueueCategory, int] = Field(default_factory=dict)
    queues: dict[SafeguardingQueueCategory, list[SafeguardingQueueItem]] = Field(default_factory=dict)
