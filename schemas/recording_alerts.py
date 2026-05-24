"""Recording alert and follow-up workflow — metadata-only manager oversight."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

RecordingAlertType = Literal[
    "high_risk_review_due",
    "safeguarding_review_due",
    "medication_error_review_due",
    "missing_episode_follow_up_due",
    "rhi_follow_up_due",
    "structured_fields_missing",
    "privacy_flags_unresolved",
    "changes_requested_pending",
    "draft_stale",
    "formal_submission_not_wired",
    "formal_submission_failed",
    "review_backlog_high",
    "manager_review_required",
    "safeguarding_escalation_required",
    "recording_quality_concern",
]

RecordingAlertSeverity = Literal["low", "medium", "high", "urgent"]

RecordingAlertStatus = Literal["open", "acknowledged", "assigned", "resolved", "archived"]

RecordingAlertActionType = Literal[
    "acknowledge",
    "assign",
    "resolve",
    "archive",
    "reopen",
    "create_intelligence_action",
]


class RecordingAlertRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    alert_type: RecordingAlertType
    severity: RecordingAlertSeverity = "medium"
    status: RecordingAlertStatus = "open"
    title: str
    description: str = ""
    safe_summary: str = ""
    draft_id: str | None = None
    review_event_id: str | None = None
    child_id: int | None = None
    child_name: str | None = None
    home_id: int | None = None
    recording_type: str | None = None
    form_id: str | None = None
    source: str = "recording_alert_service"
    route: str | None = None
    action_label: str | None = None
    owner_user_id: str | None = None
    owner_name: str | None = None
    acknowledged_by: str | None = None
    acknowledged_at: str | None = None
    resolved_by: str | None = None
    resolved_at: str | None = None
    resolution_note: str | None = None
    linked_action_id: str | None = None
    due_at: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str


class RecordingAlertCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    alert_type: RecordingAlertType
    severity: RecordingAlertSeverity = "medium"
    title: str
    description: str = ""
    safe_summary: str = ""
    draft_id: str | None = None
    review_event_id: str | None = None
    child_id: int | None = None
    child_name: str | None = None
    home_id: int | None = None
    recording_type: str | None = None
    form_id: str | None = None
    source: str = "recording_alert_service"
    route: str | None = None
    action_label: str | None = None
    due_at: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecordingAlertUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    severity: RecordingAlertSeverity | None = None
    status: RecordingAlertStatus | None = None
    title: str | None = None
    description: str | None = None
    safe_summary: str | None = None
    owner_user_id: str | None = None
    owner_name: str | None = None
    resolution_note: str | None = None
    linked_action_id: str | None = None
    due_at: str | None = None
    metadata: dict[str, Any] | None = None


class RecordingAlertActionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    action: RecordingAlertActionType
    note: str | None = None
    owner_user_id: str | None = None
    owner_name: str | None = None
    create_action: bool = False
    metadata: dict[str, Any] | None = None


class RecordingAlertActionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool = True
    alert: RecordingAlertRecord | None = None
    linked_action_id: str | None = None
    warning: str | None = None
    message: str | None = None


class RecordingAlertListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[RecordingAlertRecord] = Field(default_factory=list)
    total: int = 0
    storage_mode: str = "memory"
    persistence_available: bool = False


class RecordingAlertSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    open_count: int = 0
    urgent_count: int = 0
    safeguarding_count: int = 0
    privacy_count: int = 0
    changes_requested_count: int = 0
    overdue_count: int = 0
    stale_count: int = 0
    by_severity: dict[str, int] = Field(default_factory=dict)
    by_type: dict[str, int] = Field(default_factory=dict)
    by_status: dict[str, int] = Field(default_factory=dict)


class RecordingAlertHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ready"
    service: str = "recording_alert_service"
    storage_mode: str = "memory"
    alert_count: int = 0
    persistence_available: bool = False
    operational_only: bool = True
    standalone_access: bool = False
    degraded: bool = False
    warnings: list[str] = Field(default_factory=list)


class RecordingAlertGenerationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    child_id: int | None = None
    home_id: int | None = None
    force: bool = False
    dry_run: bool = False


class RecordingAlertGenerationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated: int = 0
    created: int = 0
    updated: int = 0
    skipped: int = 0
    dry_run: bool = False
    alerts: list[RecordingAlertRecord] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class RecordingAlertListFilters(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: RecordingAlertStatus | None = None
    severity: RecordingAlertSeverity | None = None
    alert_type: RecordingAlertType | None = None
    child_id: int | None = None
    home_id: int | None = None
    draft_id: str | None = None
    safeguarding_only: bool = False
    limit: int = Field(default=100, ge=1, le=500)
    offset: int = Field(default=0, ge=0)
