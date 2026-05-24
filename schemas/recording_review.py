"""Manager review queue for operational recording drafts — not standalone /orb."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from schemas.recording_drafts import RecordingDraftRecord

RecordingReviewDecision = Literal[
    "approve",
    "request_changes",
    "mark_safeguarding_escalation",
    "mark_reviewed",
    "submit_after_approval",
    "archive",
]

RecordingReviewStatus = Literal[
    "awaiting_review",
    "changes_requested",
    "approved",
    "safeguarding_escalation_required",
    "reviewed",
    "submitted",
    "archived",
]

RecordingReviewPriority = Literal["low", "medium", "high", "urgent"]


class RecordingReviewQueueItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    draft_id: str
    title: str = ""
    recording_type: str
    form_id: str | None = None
    category: str | None = None
    child_id: int | None = None
    child_name: str | None = None
    home_id: int | None = None
    created_by_user_id: str | None = None
    created_by_name: str | None = None
    created_by_role: str | None = None
    status: str = "draft"
    review_status: str = "awaiting_review"
    review_priority: RecordingReviewPriority = "medium"
    manager_review_required: bool = False
    safeguarding_review_required: bool = False
    safeguarding_sensitive: bool = False
    privacy_sensitive: bool = False
    quality_flags: list[str] = Field(default_factory=list)
    language_flags: list[str] = Field(default_factory=list)
    privacy_flags: list[str] = Field(default_factory=list)
    checklist_status: dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str
    route_hint: str | None = None
    formal_submit_supported: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecordingReviewEventRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    draft_id: str
    decision: str
    previous_review_status: str | None = None
    new_review_status: str | None = None
    comments: str | None = None
    reviewer_user_id: str | None = None
    reviewer_name: str | None = None
    reviewer_role: str | None = None
    home_id: int | None = None
    child_id: int | None = None
    recording_type: str | None = None
    form_id: str | None = None
    manager_review_required: bool = False
    safeguarding_review_required: bool = False
    safeguarding_escalation_required: bool = False
    submitted: bool = False
    formal_record_created: bool = False
    linked_record_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class RecordingReviewDetail(BaseModel):
    model_config = ConfigDict(extra="ignore")

    draft: RecordingDraftRecord
    review_history: list[RecordingReviewEventRecord] = Field(default_factory=list)
    submission_target: dict[str, Any] = Field(default_factory=dict)
    quality_summary: dict[str, Any] = Field(default_factory=dict)
    privacy_summary: dict[str, Any] = Field(default_factory=dict)
    suggested_review_prompts: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)


class RecordingReviewActionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    decision: RecordingReviewDecision
    comments: str | None = None
    reviewer_name: str | None = None
    reviewer_role: str | None = None
    confirm_reviewed: bool = False
    submit_after_approval: bool = False
    create_action_if_required: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecordingReviewActionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool = True
    draft_id: str
    decision: RecordingReviewDecision
    review_status: str
    comments: str | None = None
    submitted: bool = False
    formal_record_created: bool = False
    linked_record_id: str | None = None
    warnings: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    audit_reference: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecordingReviewQueueFilters(BaseModel):
    model_config = ConfigDict(extra="ignore")

    review_status: str | None = None
    safeguarding_only: bool = False
    manager_review_only: bool = False
    changes_requested_only: bool = False
    approved_only: bool = False
    urgent_only: bool = False
    child_id: int | None = None
    home_id: int | None = None
    recording_type: str | None = None
    mine_only: bool = False
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class RecordingReviewQueueResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[RecordingReviewQueueItem]
    total: int
    storage_mode: str = "memory"
    persistence_available: bool = True


class RecordingReviewHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ready"
    service: str = "recording_review_service"
    storage_mode: str = "memory"
    queue_count: int = 0
    persistence_available: bool = True
    operational_only: bool = True
    standalone_access: bool = False
    notice: str = "AI supports review. Manager judgement remains required."


class RecordingReviewSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    awaiting_review: int = 0
    safeguarding_review: int = 0
    changes_requested: int = 0
    approved: int = 0
    urgent: int = 0
    total_in_queue: int = 0
