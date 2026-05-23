"""Operational OS ORB request/response models — permissioned context only."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from schemas.orb_intelligence_output import OrbIntelligenceBoundary, OrbIntelligenceOutput

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
