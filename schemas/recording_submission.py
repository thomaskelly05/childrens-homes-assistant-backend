"""Recording draft submission router — formal workflow mapping and honest responses."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

RecordingSubmissionTargetStatus = Literal[
    "supported_now",
    "submit_as_draft_only",
    "route_to_existing_workflow",
    "review_required_before_submit",
    "unsupported",
]


class RecordingSubmissionTarget(BaseModel):
    model_config = ConfigDict(extra="ignore")

    recording_type: str
    form_id: str | None = None
    target_status: RecordingSubmissionTargetStatus
    target_record_type: str | None = None
    backend_route: str | None = None
    frontend_route: str | None = None
    service_name: str | None = None
    requires_child: bool = False
    requires_manager_review: bool = False
    safeguarding_sensitive: bool = False
    privacy_sensitive: bool = False
    chronology_link_supported: bool = False
    notes: str | None = None


class RecordingSubmissionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    draft_id: str | None = None
    target_record_type: str | None = None
    submit_to: str | None = None
    confirm_reviewed: bool = False
    force_submit: bool = False
    create_chronology_link: bool = True
    create_action_if_required: bool = False
    submitted_to: str | None = "formal_record"
    target_workflow: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecordingSubmissionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool = True
    draft_id: str
    submitted: bool = False
    formal_record_created: bool = False
    formal_record_type: str | None = None
    linked_record_id: str | None = None
    linked_chronology_id: str | None = None
    linked_archive_record_id: str | None = None
    linked_plan_impact_ids: list[str] = Field(default_factory=list)
    lifeecho_suggestion_ids: list[str] = Field(default_factory=list)
    target_status: RecordingSubmissionTargetStatus = "unsupported"
    review_required: bool = False
    safeguarding_review_required: bool = False
    privacy_guard: dict[str, Any] = Field(default_factory=dict)
    quality_summary: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    route_hint: str | None = None
    audit_reference: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    draft: dict[str, Any] | None = None


class RecordingSubmissionHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ready"
    service: str = "recording_submission_router"
    target_count: int = 0
    supported_count: int = 0
    operational_only: bool = True
    standalone_access: bool = False
