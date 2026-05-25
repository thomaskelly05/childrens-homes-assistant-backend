"""Operational OS ORB request/response models — permissioned context only."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from schemas.ai_privacy import OrbOperationalPrivacyGuardSummary
from schemas.orb_intelligence_output import OrbIntelligenceBoundary, OrbIntelligenceOutput
from schemas.orb_operational_outputs import (
    OrbOperationalOutputSaveContext,
    OrbOperationalOutputSaveHints,
    OrbOperationalOutputType,
    OrbOperationalOutputVisibility,
)

OrbOperationalMode = Literal[
    "operational_summary",
    "manager_daily_brief",
    "record_quality_review",
    "safeguarding_themes",
    "ofsted_evidence_review",
    "action_priority",
    "staff_support",
    "child_journey_summary",
    "governance_briefing",
    "general_operational_question",
    "chronology_story_review",
    "archive_summary",
    "lifeecho_memory_support",
    "plan_impact_review",
    "document_target_extraction",
]

OrbOperationalScope = Literal["home", "child", "staff", "provider", "current_user"]


class OrbOperationalRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=12000)
    mode: OrbOperationalMode = "general_operational_question"
    scope: OrbOperationalScope = "current_user"
    home_id: int | None = None
    child_id: int | None = None
    staff_id: int | None = None
    days: int = Field(default=7, ge=1, le=90)
    include_actions: bool = True
    include_record_quality: bool = True
    include_patterns: bool = True
    require_manager_review: bool = False
    save_output: bool = False
    output_type: OrbOperationalOutputType | None = None
    visibility: OrbOperationalOutputVisibility = "operational_private"
    tags: list[str] = Field(default_factory=list)
    output_title: str | None = Field(default=None, max_length=500)


class OrbOperationalContextSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    headline: str = ""
    summary_lines: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)
    attention_items: list[str] = Field(default_factory=list)
    record_quality_notes: list[str] = Field(default_factory=list)
    safeguarding_signals: list[str] = Field(default_factory=list)
    ofsted_evidence_notes: list[str] = Field(default_factory=list)
    staff_support_notes: list[str] = Field(default_factory=list)
    child_journey_notes: list[str] = Field(default_factory=list)
    governance_notes: list[str] = Field(default_factory=list)
    degraded: bool = False
    unavailable: bool = False
    permission_warnings: list[str] = Field(default_factory=list)


class OrbOperationalSource(BaseModel):
    model_config = ConfigDict(extra="ignore")

    label: str
    source_type: str
    basis: str | None = None
    route: str | None = None
    excerpt: str | None = None


class OrbOperationalSafetyBoundary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    permissioned_context_only: bool = True
    no_threshold_decisions: bool = True
    no_ofsted_grade_predictions: bool = True
    manager_review_required: bool = False
    evidence_based: bool = True
    child_centred: bool = True
    notices: list[str] = Field(default_factory=list)


class OrbOperationalPermissionSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    role: str | None = None
    allowed_home_ids: list[int] = Field(default_factory=list)
    home_id: int | None = None
    provider_id: int | None = None
    care_record_access: bool = False
    scope_resolved: str | None = None


OrbOperationalContextCardType = Literal[
    "manager_daily_brief",
    "safeguarding_theme",
    "record_quality",
    "action_attention",
    "ofsted_evidence",
    "workforce",
    "child_journey",
    "governance",
    "context_health",
]

OrbOperationalSeverity = Literal["info", "low", "medium", "high", "urgent"]

OrbOperationalPriority = Literal["low", "medium", "high", "urgent"]


class OrbOperationalContextCard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    type: OrbOperationalContextCardType
    summary: str
    severity: OrbOperationalSeverity = "info"
    source_label: str | None = None
    route_hint: str | None = None
    count: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbOperationalEvidenceItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    label: str
    source_type: str
    basis: str | None = None
    route: str | None = None
    severity: OrbOperationalSeverity = "info"


class OrbOperationalRecommendation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    summary: str
    priority: OrbOperationalPriority = "medium"
    rationale: str | None = None
    source_labels: list[str] = Field(default_factory=list)
    suggested_action: str | None = None
    review_required: bool = False
    manager_review_reason: str | None = None
    route_hint: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbOperationalDraftAction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    description: str
    priority: OrbOperationalPriority = "medium"
    source: str | None = None
    due_label: str | None = None
    owner_label: str | None = None
    review_required: bool = True
    evidence_basis: str | None = None
    standalone_only: bool = False
    os_linked: bool = True


class OrbOperationalBriefing(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    summary: str
    key_points: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    actions: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    evaluation: dict[str, Any] | None = None
    created_from_mode: str | None = None
    context_scope: str | None = None
    saved_as_output_id: str | None = None


class OrbOperationalReviewPrompt(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    reason: str
    priority: OrbOperationalPriority = "medium"
    route_hint: str | None = None


class OrbOperationalAuditSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    audit_reference: str | None = None
    role: str | None = None
    scope: str | None = None
    permissioned_context: bool = True
    care_record_access: bool = False
    boundary_notice: str | None = None


class OrbOperationalContextStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")

    available: bool = True
    degraded: bool = False
    unavailable: bool = False
    care_record_access: bool = False
    homes_accessible: int | None = None
    message: str | None = None
    permission_warnings: list[str] = Field(default_factory=list)


class OrbOperationalFollowUpAction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    label: str
    route: str | None = None
    action_type: str = "review"


class OrbOperationalActionsDraftRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=12000)
    mode: OrbOperationalMode = "action_priority"
    scope: OrbOperationalScope = "current_user"
    home_id: int | None = None
    child_id: int | None = None
    staff_id: int | None = None
    days: int = Field(default=7, ge=1, le=90)
    answer: str | None = None


class OrbOperationalActionsCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    drafts: list[OrbOperationalDraftAction] = Field(default_factory=list)
    home_id: int | None = None
    child_id: int | None = None
    staff_id: int | None = None
    require_manager_review: bool = True
    output_id: str | None = Field(default=None, max_length=120)


class OrbOperationalBriefingRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=12000)
    mode: OrbOperationalMode = "manager_daily_brief"
    scope: OrbOperationalScope = "current_user"
    home_id: int | None = None
    child_id: int | None = None
    staff_id: int | None = None
    days: int = Field(default=7, ge=1, le=90)
    answer: str | None = None
    save: bool = False
    output_type: OrbOperationalOutputType | None = None
    visibility: OrbOperationalOutputVisibility = "operational_private"
    tags: list[str] = Field(default_factory=list)
    title: str | None = Field(default=None, max_length=500)


class OrbOperationalResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    answer: str
    intelligence_output: OrbIntelligenceOutput | None = None
    context_summary: OrbOperationalContextSummary
    sources: list[OrbOperationalSource] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    evaluation: dict[str, Any] | None = None
    model_routing: dict[str, Any] | None = None
    permissions: OrbOperationalPermissionSummary
    boundaries: OrbOperationalSafetyBoundary
    warnings: list[str] = Field(default_factory=list)
    audit_reference: str | None = None
    os_linked: bool = True
    care_record_access: bool = False
    standalone_only: bool = False
    permissioned_context: bool = True
    context_cards: list[OrbOperationalContextCard] = Field(default_factory=list)
    evidence_items: list[OrbOperationalEvidenceItem] = Field(default_factory=list)
    recommendations: list[OrbOperationalRecommendation] = Field(default_factory=list)
    draft_actions: list[OrbOperationalDraftAction] = Field(default_factory=list)
    review_prompts: list[OrbOperationalReviewPrompt] = Field(default_factory=list)
    audit_summary: OrbOperationalAuditSummary | None = None
    context_status: OrbOperationalContextStatus | None = None
    follow_up_actions: list[OrbOperationalFollowUpAction] = Field(default_factory=list)
    briefing: OrbOperationalBriefing | None = None
    save_available: bool = False
    suggested_output_type: OrbOperationalOutputType | None = None
    suggested_title: str | None = None
    suggested_tags: list[str] = Field(default_factory=list)
    operational_output: OrbOperationalOutputSaveContext | None = None
    action_creation_available: bool = True
    privacy_guard: OrbOperationalPrivacyGuardSummary | None = None


class OrbOperationalHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ready"
    surface: str = "operational_os_orb"
    os_linked: bool = True
    care_record_access: bool = True
    standalone_only: bool = False
    permissioned_context: bool = True
    modes: list[str] = Field(default_factory=list)
    scopes: list[str] = Field(default_factory=list)
