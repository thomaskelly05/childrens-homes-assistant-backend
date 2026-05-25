"""SCCIF and Children's Homes Quality Standards alignment schemas — metadata only."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

SccifJudgementArea = Literal[
    "overall_experiences_progress",
    "helped_and_protected",
    "leadership_management",
]

QualityStandardArea = Literal[
    "quality_purpose",
    "views_wishes_feelings",
    "education",
    "enjoyment_achievement",
    "health_wellbeing",
    "positive_relationships",
    "protection_children",
    "leadership_management",
    "care_planning",
]

EvidenceStrength = Literal[
    "strong_evidence",
    "partial_evidence",
    "prompt_only",
    "route_hint_only",
    "not_yet_wired",
    "not_safe_to_summarise",
]

EvidenceRisk = Literal["low", "medium", "high", "urgent"]


class SccifOfficialSourceRef(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    url: str | None = None
    family: str | None = None
    publisher: str | None = None
    note: str | None = None


class SccifEvidenceItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    safe_summary: str
    source_module: str
    route: str
    action_label: str | None = None
    judgement_areas: list[SccifJudgementArea] = Field(default_factory=list)
    quality_standards: list[QualityStandardArea] = Field(default_factory=list)
    evidence_strength: EvidenceStrength = "partial_evidence"
    risk: EvidenceRisk = "low"
    child_id: int | None = None
    staff_id: str | None = None
    home_id: int | None = None
    related_id: str | None = None
    related_type: str | None = None
    draft_status: str | None = None
    review_required: bool = False
    manager_review_required: bool = False
    safeguarding_review_required: bool = False
    privacy_sensitive: bool = False
    official_source_refs: list[SccifOfficialSourceRef] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SccifEvidenceGap(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: str
    judgement_area: SccifJudgementArea | None = None
    quality_standard: QualityStandardArea | None = None
    risk: EvidenceRisk = "medium"
    route: str
    action_label: str | None = None
    recommended_action: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class SccifJudgementSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    area: SccifJudgementArea
    title: str
    evidence_count: int = 0
    gap_count: int = 0
    strong_count: int = 0
    partial_count: int = 0
    draft_or_prompt_count: int = 0
    manager_review_count: int = 0
    safeguarding_count: int = 0
    safe_summary: str = ""
    route: str = "/intelligence/sccif"
    evidence_strength: EvidenceStrength = "partial_evidence"
    metadata: dict[str, Any] = Field(default_factory=dict)


class SccifQualityStandardSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    area: QualityStandardArea
    title: str
    regulation_hint: str | None = None
    evidence_count: int = 0
    gap_count: int = 0
    strong_count: int = 0
    partial_count: int = 0
    draft_or_prompt_count: int = 0
    safe_summary: str = ""
    route: str = "/intelligence/sccif"
    evidence_strength: EvidenceStrength = "partial_evidence"
    metadata: dict[str, Any] = Field(default_factory=dict)


class SccifAlignmentRoutes(BaseModel):
    model_config = ConfigDict(extra="ignore")

    dashboard: str = "/intelligence/sccif"
    record_governance: str = "/record/governance"
    record_reviews: str = "/record/reviews"
    record_alerts: str = "/record/alerts"
    handover: str = "/handover"
    safeguarding: str = "/safeguarding"
    care_hub: str = "/command-centre"
    briefing: str = "/command-centre/briefing"
    staff: str = "/staff"
    knowledge_library: str = "/assistant/orb?mode=knowledge_library"
    orb: str = "/assistant/orb?mode=ofsted_evidence_review"


class SccifAlignmentDashboard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated_at: str
    scope: dict[str, Any] = Field(default_factory=dict)
    summary: str = ""
    judgement_summary: list[SccifJudgementSummary] = Field(default_factory=list)
    quality_standard_summary: list[SccifQualityStandardSummary] = Field(default_factory=list)
    evidence_items: list[SccifEvidenceItem] = Field(default_factory=list)
    evidence_gaps: list[SccifEvidenceGap] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    official_sources: list[SccifOfficialSourceRef] = Field(default_factory=list)
    privacy_notice: str = ""
    orb_prompts: list[dict[str, str]] = Field(default_factory=list)
    routes: SccifAlignmentRoutes = Field(default_factory=SccifAlignmentRoutes)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SccifAlignmentHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    service: str = "sccif_alignment_service"
    registry: str = "sccif_alignment_registry_service"
    metadata_only: bool = True
    operational_only: bool = True
    standalone_access: bool = False
    sources_available: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class SccifAlignmentFilters(BaseModel):
    model_config = ConfigDict(extra="ignore")

    child_id: int | None = None
    staff_id: str | None = None
    home_id: int | None = None
    judgement_area: SccifJudgementArea | None = None
    quality_standard: QualityStandardArea | None = None
    evidence_strength: EvidenceStrength | None = None
    risk: EvidenceRisk | None = None
    date_from: str | None = None
    date_to: str | None = None
    limit: int = 100
