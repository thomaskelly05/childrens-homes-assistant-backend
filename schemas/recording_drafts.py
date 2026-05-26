"""Operational OS recording workspace drafts — not exposed to standalone /orb."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from schemas.recording_form_metadata import RecordingFormMetadata, merge_form_metadata

RecordingDraftStatus = Literal["draft", "ready_for_review", "submitted", "archived", "deleted"]

RecordingDraftReviewStatus = Literal[
    "not_required",
    "manager_review_required",
    "safeguarding_review_required",
    "awaiting_review",
    "changes_requested",
    "approved",
    "safeguarding_escalation_required",
    "reviewed",
    "submitted",
    "archived",
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
    structured_data: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    record_date: str | None = None
    event_date: str | None = None
    event_time: str | None = None


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
    structured_data: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None
    record_date: str | None = None
    event_date: str | None = None
    event_time: str | None = None


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
    structured_template_id: str | None = None
    structured_template_version: str | None = None
    structured_data: dict[str, Any] = Field(default_factory=dict)
    structured_summary: dict[str, Any] = Field(default_factory=dict)
    structured_completion: dict[str, Any] = Field(default_factory=dict)
    structured_review_triggers: list[str] = Field(default_factory=list)
    privacy_guard: dict[str, Any] = Field(default_factory=dict)
    redaction_summary: dict[str, Any] = Field(default_factory=dict)
    minimisation_summary: dict[str, Any] = Field(default_factory=dict)
    linked_record_id: str | None = None
    linked_chronology_id: str | None = None
    submitted_to: str | None = None
    submitted_at: str | None = None
    reviewed_at: str | None = None
    review_comments: str | None = None
    reviewed_by_user_id: str | None = None
    reviewed_by_name: str | None = None
    reviewed_by_role: str | None = None
    review_priority: str = "medium"
    changes_requested_at: str | None = None
    approved_at: str | None = None
    safeguarding_escalation_at: str | None = None
    archived_at: str | None = None
    record_date: str | None = None
    event_date: str | None = None
    event_time: str | None = None
    signed_off_by_user_id: str | None = None
    signed_off_by_name: str | None = None
    signed_off_at: str | None = None
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
    linked_chronology_id: str | None = None
    submission: dict[str, Any] | None = None


class RecordingDraftHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ready"
    service: str = "recording_draft_service"
    storage_mode: str = "memory"
    draft_count: int = 0
    persistence_available: bool = True
    operational_only: bool = True
    standalone_access: bool = False


def extract_form_record_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    if not metadata:
        return {}
    form_record = metadata.get("form_record")
    return form_record if isinstance(form_record, dict) else {}


def form_metadata_from_draft(record: RecordingDraftRecord) -> RecordingFormMetadata:
    """Build typed form metadata from draft record + metadata.form_record."""
    raw = extract_form_record_metadata(record.metadata)
    patch: dict[str, Any] = {
        "written_by_user_id": record.created_by_user_id,
        "written_by_name": record.created_by_name,
        "written_by_role": record.created_by_role,
        "child_id": record.child_id,
        "home_id": record.home_id,
        "form_id": record.form_id,
        "form_type": record.recording_type,
        "category": record.category,
        "review_status": record.review_status,
        "manager_review_required": record.manager_review_required,
        "safeguarding_review_required": record.safeguarding_review_required,
        "privacy_sensitive": record.privacy_sensitive,
        "reviewed_by_user_id": record.reviewed_by_user_id,
        "reviewed_by_name": record.reviewed_by_name,
        "reviewed_at": record.reviewed_at,
        "signed_off_by_user_id": record.signed_off_by_user_id,
        "signed_off_by_name": record.signed_off_by_name,
        "signed_off_at": record.signed_off_at,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
        "status": record.status if record.status != "archived" else "archived",
        "is_signed_off": record.status in ("submitted", "archived") and record.review_status in (
            "approved",
            "reviewed",
            "submitted",
        ),
        "is_editable": record.status not in ("submitted", "archived")
        or record.review_status not in ("approved", "reviewed", "submitted"),
    }
    if record.record_date:
        patch["record_date"] = record.record_date
    if record.event_date:
        patch["event_date"] = record.event_date
    if record.event_time:
        patch["event_time"] = record.event_time
    merged = {**raw, **{k: v for k, v in patch.items() if v is not None}}
    return RecordingFormMetadata.model_validate(merged)
