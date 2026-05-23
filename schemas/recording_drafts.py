"""Operational OS recording workspace drafts — not exposed to standalone /orb."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

RecordingDraftStatus = Literal["draft", "ready_for_review", "submitted", "archived", "deleted"]

RecordingDraftReviewStatus = Literal[
    "not_required",
    "manager_review_required",
    "safeguarding_review_required",
    "awaiting_review",
    "reviewed",
]


class RecordingDraftPrivacyMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore")

    surface: str = "record_hub"
    permission_allowed: bool = True
    redaction_applied: bool = False
    minimisation_applied: bool = False
    warnings: list[str] = Field(default_factory=list)
    notice: str | None = None


class RecordingDraftQualityMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore")

    overall: str | None = None
    flagged_phrases: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    word_count: int = 0


class RecordingDraftCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = ""
    body: str = ""
    recording_type: str
    form_id: str | None = None
    category: str | None = None
    child_id: int | None = None
    child_name: str | None = None
    home_id: int | None = None
    staff_id: int | None = None
    context_type: str | None = None
    manager_review_required: bool = False
    safeguarding_review_required: bool = False
    privacy_sensitive: bool = False
    safeguarding_sensitive: bool = False
    quality_flags: list[str] = Field(default_factory=list)
    language_flags: list[str] = Field(default_factory=list)
    privacy_flags: list[str] = Field(default_factory=list)
    checklist_status: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecordingDraftUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = None
    body: str | None = None
    recording_type: str | None = None
    form_id: str | None = None
    category: str | None = None
    child_id: int | None = None
    child_name: str | None = None
    home_id: int | None = None
    staff_id: int | None = None
    context_type: str | None = None
    status: RecordingDraftStatus | None = None
    review_status: RecordingDraftReviewStatus | None = None
    manager_review_required: bool | None = None
    safeguarding_review_required: bool | None = None
    privacy_sensitive: bool | None = None
    safeguarding_sensitive: bool | None = None
    quality_flags: list[str] | None = None
    language_flags: list[str] | None = None
    privacy_flags: list[str] | None = None
    checklist_status: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None


class RecordingDraftRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str = ""
    body: str = ""
    recording_type: str
    form_id: str | None = None
    category: str | None = None
    status: RecordingDraftStatus = "draft"
    review_status: RecordingDraftReviewStatus = "not_required"
    child_id: int | None = None
    child_name: str | None = None
    home_id: int | None = None
    staff_id: int | None = None
    context_type: str | None = None
    created_by_user_id: str | None = None
    created_by_name: str | None = None
    created_by_role: str | None = None
    manager_review_required: bool = False
    safeguarding_review_required: bool = False
    privacy_sensitive: bool = False
    safeguarding_sensitive: bool = False
    quality_flags: list[str] = Field(default_factory=list)
    language_flags: list[str] = Field(default_factory=list)
    privacy_flags: list[str] = Field(default_factory=list)
    checklist_status: dict[str, Any] = Field(default_factory=dict)
    privacy_guard: dict[str, Any] = Field(default_factory=dict)
    redaction_summary: dict[str, Any] = Field(default_factory=dict)
    minimisation_summary: dict[str, Any] = Field(default_factory=dict)
    linked_record_id: str | None = None
    linked_chronology_id: str | None = None
    submitted_to: str | None = None
    submitted_at: str | None = None
    reviewed_at: str | None = None
    archived_at: str | None = None
    created_at: str
    updated_at: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecordingDraftListRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: RecordingDraftStatus | None = None
    review_status: RecordingDraftReviewStatus | None = None
    recording_type: str | None = None
    child_id: int | None = None
    home_id: int | None = None
    include_archived: bool = False
    include_deleted: bool = False
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class RecordingDraftListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[RecordingDraftRecord]
    total: int
    storage_mode: str = "memory"
    persistence_available: bool = True


class RecordingDraftSubmitRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    submitted_to: str | None = "draft_workspace"
    target_workflow: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecordingDraftSubmitResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    draft: RecordingDraftRecord
    warning: str
    formal_record_created: bool = False
    linked_record_id: str | None = None


class RecordingDraftHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ready"
    service: str = "recording_draft_service"
    storage_mode: str = "memory"
    draft_count: int = 0
    persistence_available: bool = True
    operational_only: bool = True
    standalone_access: bool = False
