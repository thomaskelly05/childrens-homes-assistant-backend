"""Reg 45 Quality of Care Review schemas — draft review support, metadata only."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from schemas.sccif_alignment import QualityStandardArea, SccifJudgementArea

Reg45ReviewStatus = Literal[
    "draft",
    "evidence_gathering",
    "ready_for_manager_review",
    "manager_reviewed",
    "ri_review_required",
    "ri_reviewed",
    "finalised",
    "archived",
]

Reg45ReviewSectionType = Literal[
    "summary",
    "child_voice",
    "progress_outcomes",
    "quality_purpose",
    "safeguarding_protection",
    "education",
    "health_wellbeing",
    "positive_relationships",
    "care_planning",
    "workforce_leadership",
    "patterns_themes",
    "improvement_actions",
    "provider_ri_review",
    "final_reflections",
]

Reg45EvidenceStrength = Literal[
    "strong_evidence",
    "partial_evidence",
    "draft_only",
    "prompt_only",
    "route_hint_only",
    "not_yet_wired",
    "not_safe_to_summarise",
]

Reg45EvidenceRisk = Literal["low", "medium", "high", "urgent"]


class Reg45OfficialSourceRef(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    url: str | None = None
    note: str | None = None


class Reg45ReviewEvidenceItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    safe_summary: str
    source_module: str
    source_type: str = "metadata"
    route: str
    action_label: str | None = None
    section_types: list[Reg45ReviewSectionType] = Field(default_factory=list)
    quality_standards: list[QualityStandardArea] = Field(default_factory=list)
    sccif_judgement_areas: list[SccifJudgementArea] = Field(default_factory=list)
    evidence_strength: Reg45EvidenceStrength = "partial_evidence"
    draft_status: str | None = None
    risk: Reg45EvidenceRisk = "low"
    review_required: bool = False
    manager_review_required: bool = False
    safeguarding_review_required: bool = False
    privacy_sensitive: bool = False
    related_id: str | None = None
    related_type: str | None = None
    child_id: int | None = None
    staff_id: str | None = None
    home_id: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class Reg45ReviewGap(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: str
    section_type: Reg45ReviewSectionType
    quality_standard: QualityStandardArea | None = None
    risk: Reg45EvidenceRisk = "medium"
    route: str
    action_label: str | None = None
    recommended_action: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class Reg45ImprovementActionDraft(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: str
    source_gap_id: str | None = None
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    suggested_owner_role: str = "registered_manager"
    due_in_days: int | None = None
    route: str = "/actions"
    action_label: str | None = "Review action"
    metadata: dict[str, Any] = Field(default_factory=dict)


class Reg45ReviewSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    section_type: Reg45ReviewSectionType
    summary: str
    evidence_items: list[Reg45ReviewEvidenceItem] = Field(default_factory=list)
    gaps: list[Reg45ReviewGap] = Field(default_factory=list)
    improvement_actions: list[Reg45ImprovementActionDraft] = Field(default_factory=list)
    reviewer_notes: str | None = None
    warnings: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class Reg45QualityReview(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    status: Reg45ReviewStatus = "draft"
    generated_at: str
    period_start: str | None = None
    period_end: str | None = None
    home_id: int | None = None
    summary: str
    sections: list[Reg45ReviewSection] = Field(default_factory=list)
    evidence_count: int = 0
    gap_count: int = 0
    draft_only_count: int = 0
    improvement_action_count: int = 0
    review_required_count: int = 0
    safeguarding_review_count: int = 0
    limitations: list[str] = Field(default_factory=list)
    privacy_notice: str = ""
    official_sources: list[Reg45OfficialSourceRef] = Field(default_factory=list)
    orb_prompts: list[dict[str, str]] = Field(default_factory=list)
    routes: dict[str, str] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class Reg45ReviewCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = None
    period_start: str | None = None
    period_end: str | None = None
    home_id: int | None = None
    from_inspection_pack_id: str | None = None
    save_draft: bool = True
    create_improvement_actions: bool = False


class Reg45ReviewUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: Reg45ReviewStatus | None = None
    reviewer_notes: str | None = None
    sections: list[Reg45ReviewSection] | None = None
    metadata: dict[str, Any] | None = None


Reg45ReviewActionType = Literal[
    "mark_ready_for_manager_review",
    "mark_manager_reviewed",
    "request_ri_review",
    "mark_ri_reviewed",
    "finalise",
    "archive",
    "create_actions_from_gaps",
]


class Reg45ReviewActionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    action: Reg45ReviewActionType
    note: str | None = None
    metadata: dict[str, Any] | None = None


class Reg45ReviewActionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool = True
    review: Reg45QualityReview | None = None
    previous_status: str | None = None
    new_status: str | None = None
    action_ids: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    message: str = ""


class Reg45ReviewDashboard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated_at: str
    summary: str
    draft_review_count: int = 0
    ready_for_manager_count: int = 0
    ri_review_required_count: int = 0
    recent_reviews: list[dict[str, Any]] = Field(default_factory=list)
    key_gaps: list[Reg45ReviewGap] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    privacy_notice: str = ""
    routes: dict[str, str] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class Reg45ReviewHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    persistence_available: bool = False
    sources_available: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
