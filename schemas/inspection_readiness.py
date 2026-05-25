"""Inspection readiness schemas — Reg 44 / Reg 45 evidence support packs, metadata only."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from schemas.sccif_alignment import QualityStandardArea, SccifJudgementArea

InspectionPackType = Literal["reg44", "reg45", "sccif", "quality_standards", "custom"]

InspectionEvidenceStrength = Literal[
    "strong_evidence",
    "partial_evidence",
    "draft_only",
    "prompt_only",
    "route_hint_only",
    "not_yet_wired",
    "not_safe_to_summarise",
]

InspectionEvidenceRisk = Literal["low", "medium", "high", "urgent"]


class InspectionOfficialSourceRef(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    url: str | None = None
    note: str | None = None


class InspectionEvidenceItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    safe_summary: str
    source_module: str
    source_type: str = "metadata"
    route: str
    action_label: str | None = None
    pack_types: list[InspectionPackType] = Field(default_factory=list)
    sccif_judgement_areas: list[SccifJudgementArea] = Field(default_factory=list)
    quality_standards: list[QualityStandardArea] = Field(default_factory=list)
    evidence_strength: InspectionEvidenceStrength = "partial_evidence"
    risk: InspectionEvidenceRisk = "low"
    draft_status: str | None = None
    review_required: bool = False
    manager_review_required: bool = False
    safeguarding_review_required: bool = False
    privacy_sensitive: bool = False
    child_id: int | None = None
    staff_id: str | None = None
    home_id: int | None = None
    related_id: str | None = None
    related_type: str | None = None
    official_source_refs: list[InspectionOfficialSourceRef] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class InspectionEvidenceGap(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: str
    pack_type: InspectionPackType
    sccif_judgement_area: SccifJudgementArea | None = None
    quality_standard: QualityStandardArea | None = None
    risk: InspectionEvidenceRisk = "medium"
    route: str
    action_label: str | None = None
    recommended_action: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class InspectionPackSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    summary: str
    pack_type: InspectionPackType
    evidence_items: list[InspectionEvidenceItem] = Field(default_factory=list)
    gaps: list[InspectionEvidenceGap] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class InspectionEvidencePack(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    pack_type: InspectionPackType
    generated_at: str
    period_start: str | None = None
    period_end: str | None = None
    scope: dict[str, Any] = Field(default_factory=dict)
    summary: str
    sections: list[InspectionPackSection] = Field(default_factory=list)
    evidence_count: int = 0
    gap_count: int = 0
    urgent_gap_count: int = 0
    review_required_count: int = 0
    draft_only_count: int = 0
    limitations: list[str] = Field(default_factory=list)
    privacy_notice: str = ""
    official_sources: list[InspectionOfficialSourceRef] = Field(default_factory=list)
    orb_prompts: list[dict[str, str]] = Field(default_factory=list)
    routes: dict[str, str] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class InspectionPackSaveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    pack_type: InspectionPackType
    title: str | None = None
    period_start: str | None = None
    period_end: str | None = None
    scope: dict[str, Any] | None = None
    save_output: bool = False
    create_actions_from_gaps: bool = False
    pack: InspectionEvidencePack | None = None


class InspectionPackSaveResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool
    pack: InspectionEvidencePack
    saved_output_id: str | None = None
    action_ids: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)


class InspectionReadinessDashboard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated_at: str
    summary: str
    reg44_summary: str = ""
    reg45_summary: str = ""
    sccif_summary: str = ""
    quality_standards_summary: str = ""
    recent_packs: list[dict[str, Any]] = Field(default_factory=list)
    key_gaps: list[InspectionEvidenceGap] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    privacy_notice: str = ""
    routes: dict[str, str] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class InspectionReadinessHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    pack_types: list[str] = Field(default_factory=list)
    sources_available: list[str] = Field(default_factory=list)
    persistence_available: bool = False
    limitations: list[str] = Field(default_factory=list)


class InspectionReadinessFilters(BaseModel):
    model_config = ConfigDict(extra="ignore")

    pack_type: InspectionPackType | None = None
    child_id: int | None = None
    staff_id: str | None = None
    home_id: int | None = None
    period_start: str | None = None
    period_end: str | None = None
    evidence_strength: InspectionEvidenceStrength | None = None
    risk: InspectionEvidenceRisk | None = None
    limit: int = 100
