"""Recording governance dashboard schemas — metadata only, not standalone /orb."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

RecordingGovernanceRiskLevel = Literal["low", "medium", "high", "urgent"]


class RecordingGovernanceMetricCard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    value: str | int
    label: str = ""
    tone: str = "neutral"
    route: str | None = None
    description: str | None = None
    trend: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecordingGovernanceBacklogMetric(BaseModel):
    model_config = ConfigDict(extra="ignore")

    awaiting_review: int = 0
    urgent: int = 0
    safeguarding_review: int = 0
    changes_requested: int = 0
    approved: int = 0
    submitted: int = 0
    overdue: int = 0
    by_priority: dict[str, int] = Field(default_factory=dict)


class RecordingGovernanceQualityMetric(BaseModel):
    model_config = ConfigDict(extra="ignore")

    total_drafts: int = 0
    incomplete_structured_forms: int = 0
    missing_child_voice: int = 0
    missing_follow_up: int = 0
    judgemental_language_flags: int = 0
    privacy_flags: int = 0
    manager_review_flags: int = 0
    safeguarding_review_flags: int = 0


class RecordingGovernanceFormUsage(BaseModel):
    model_config = ConfigDict(extra="ignore")

    form_id: str | None = None
    recording_type: str
    title: str = ""
    category: str | None = None
    count: int = 0
    high_risk_count: int = 0
    submitted_count: int = 0
    review_required_count: int = 0


class RecordingGovernanceReviewOutcome(BaseModel):
    model_config = ConfigDict(extra="ignore")

    approved: int = 0
    changes_requested: int = 0
    safeguarding_escalation: int = 0
    submitted_after_approval: int = 0
    archived: int = 0


class RecordingGovernanceAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: str
    risk_level: RecordingGovernanceRiskLevel = "medium"
    route: str | None = None
    action_label: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecordingGovernanceItem(BaseModel):
    """Safe list row — no raw record body."""

    model_config = ConfigDict(extra="ignore")

    draft_id: str
    title: str = ""
    recording_type: str
    form_id: str | None = None
    category: str | None = None
    status: str = "draft"
    review_status: str = "not_required"
    review_priority: str = "medium"
    child_id: int | None = None
    child_name: str | None = None
    home_id: int | None = None
    created_by_name: str | None = None
    safeguarding_sensitive: bool = False
    privacy_sensitive: bool = False
    quality_flag_count: int = 0
    privacy_flag_count: int = 0
    structured_incomplete: bool = False
    updated_at: str
    draft_route: str
    review_route: str | None = None
    child_journey_route: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecordingGovernanceFilters(BaseModel):
    model_config = ConfigDict(extra="ignore")

    child_id: int | None = None
    home_id: int | None = None
    recording_type: str | None = None
    category: str | None = None
    status: str | None = None
    review_status: str | None = None
    date_from: str | None = None
    date_to: str | None = None
    high_risk_only: bool = False
    safeguarding_only: bool = False
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class RecordingGovernanceHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ready"
    service: str = "recording_governance_service"
    storage_mode: str = "memory"
    draft_count: int = 0
    review_event_count: int = 0
    persistence_available: bool = True
    operational_only: bool = True
    standalone_access: bool = False
    degraded: bool = False
    warnings: list[str] = Field(default_factory=list)


class RecordingGovernanceDashboard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated_at: str
    scope: str = "home"
    summary_cards: list[RecordingGovernanceMetricCard] = Field(default_factory=list)
    backlog: RecordingGovernanceBacklogMetric = Field(default_factory=RecordingGovernanceBacklogMetric)
    quality: RecordingGovernanceQualityMetric = Field(default_factory=RecordingGovernanceQualityMetric)
    form_usage: list[RecordingGovernanceFormUsage] = Field(default_factory=list)
    review_outcomes: RecordingGovernanceReviewOutcome = Field(
        default_factory=RecordingGovernanceReviewOutcome
    )
    alerts: list[RecordingGovernanceAlert] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    privacy_notice: str = (
        "This view uses recording metadata, flags and summaries. "
        "It does not display full raw record bodies."
    )
    limitations: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
