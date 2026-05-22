from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE

ActionPriority = Literal["low", "medium", "high", "urgent"]
ActionStatus = Literal["proposed", "accepted", "in_progress", "completed", "dismissed", "superseded"]
ActionType = Literal[
    "safeguarding_review",
    "missing_follow_up",
    "risk_assessment_review",
    "manager_signoff",
    "record_quality_review",
    "child_voice_follow_up",
    "evidence_gap_review",
    "reg44_action_review",
    "reg45_action_review",
    "staff_support_review",
    "training_supervision_review",
    "ofsted_evidence_strengthening",
    "policy_practice_review",
]
OversightDecision = Literal["accepted", "dismissed", "deferred", "completed", "superseded"]


class IntelligenceActionCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    home_id: str | None = None
    child_id: str | None = None
    staff_id: str | None = None
    source_finding_id: str | None = None
    source_finding_type: str | None = None
    source_service: str | None = None
    action_type: ActionType
    title: str
    summary: str | None = None
    priority: ActionPriority = "medium"
    owner_role: str = "registered_manager"
    owner_user_id: str | None = None
    due_date: str | None = None
    linked_record_ids: list[str] = Field(default_factory=list)
    linked_evidence_ids: list[str] = Field(default_factory=list)
    linked_action_ids: list[str] = Field(default_factory=list)
    regulatory_links: list[str] = Field(default_factory=list)
    sccif_links: list[str] = Field(default_factory=list)
    quality_standard_links: list[str] = Field(default_factory=list)
    reason: str | None = None
    suggested_next_step: str | None = None


class IntelligenceActionUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = None
    summary: str | None = None
    priority: ActionPriority | None = None
    status: ActionStatus | None = None
    owner_role: str | None = None
    owner_user_id: str | None = None
    due_date: str | None = None
    linked_record_ids: list[str] | None = None
    linked_evidence_ids: list[str] | None = None
    linked_action_ids: list[str] | None = None
    regulatory_links: list[str] | None = None
    sccif_links: list[str] | None = None
    quality_standard_links: list[str] | None = None
    reason: str | None = None
    suggested_next_step: str | None = None
    manager_decision_reason: str | None = None


class IntelligenceActionDecision(BaseModel):
    model_config = ConfigDict(extra="ignore")

    decision: Literal["accept", "dismiss", "in_progress", "complete", "supersede"]
    reason: str | None = None
    manager_notes: str | None = None


class IntelligenceActionAuditEntry(BaseModel):
    at: str
    event: str
    actor_id: str | None = None
    reason: str | None = None
    notes: str | None = None


class IntelligenceActionRecord(BaseModel):
    id: str
    home_id: str | None = None
    child_id: str | None = None
    staff_id: str | None = None
    source_finding_id: str | None = None
    source_finding_type: str | None = None
    source_service: str | None = None
    action_type: ActionType
    title: str
    summary: str | None = None
    priority: ActionPriority = "medium"
    status: ActionStatus = "proposed"
    owner_role: str = "registered_manager"
    owner_user_id: str | None = None
    due_date: str | None = None
    linked_record_ids: list[str] = Field(default_factory=list)
    linked_evidence_ids: list[str] = Field(default_factory=list)
    linked_action_ids: list[str] = Field(default_factory=list)
    regulatory_links: list[str] = Field(default_factory=list)
    sccif_links: list[str] = Field(default_factory=list)
    quality_standard_links: list[str] = Field(default_factory=list)
    reason: str | None = None
    suggested_next_step: str | None = None
    manager_decision: str | None = None
    manager_decision_reason: str | None = None
    created_at: str = ""
    updated_at: str = ""
    completed_at: str | None = None
    audit_trail: list[IntelligenceActionAuditEntry | dict[str, Any]] = Field(default_factory=list)
    decision_support_notice: str = SAFE_DECISION_SUPPORT_NOTICE


class IntelligenceActionListResponse(BaseModel):
    actions: list[IntelligenceActionRecord] = Field(default_factory=list)
    total: int = 0
    persistence_available: bool = False
    decision_support_notice: str = SAFE_DECISION_SUPPORT_NOTICE


class IntelligenceOversightReviewCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    home_id: str | None = None
    child_id: str | None = None
    staff_id: str | None = None
    review_type: str
    source: str | None = None
    finding_ids: list[str] = Field(default_factory=list)
    action_ids: list[str] = Field(default_factory=list)
    decision: OversightDecision
    decision_reason: str | None = None
    manager_notes: str | None = None
    follow_up_required: bool = False
    follow_up_date: str | None = None


class IntelligenceOversightReviewRecord(BaseModel):
    id: str
    home_id: str | None = None
    child_id: str | None = None
    staff_id: str | None = None
    review_type: str
    source: str | None = None
    finding_ids: list[str] = Field(default_factory=list)
    action_ids: list[str] = Field(default_factory=list)
    decision: str
    decision_reason: str | None = None
    manager_notes: str | None = None
    follow_up_required: bool = False
    follow_up_date: str | None = None
    created_by: str | None = None
    created_at: str = ""
    decision_support_notice: str = SAFE_DECISION_SUPPORT_NOTICE


class IntelligenceActionSummary(BaseModel):
    total: int = 0
    by_status: dict[str, int] = Field(default_factory=dict)
    by_priority: dict[str, int] = Field(default_factory=dict)
    by_type: dict[str, int] = Field(default_factory=dict)
    urgent_count: int = 0
    proposed_count: int = 0
    decision_support_notice: str = SAFE_DECISION_SUPPORT_NOTICE
