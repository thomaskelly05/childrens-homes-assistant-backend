from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE

IntelligenceMode = Literal["home", "child", "staff", "inspection", "manager_daily_brief"]
Severity = Literal["low", "medium", "high", "critical"]
EvidenceStrength = Literal["limited", "emerging", "moderate", "strong"]
RecordQuality = Literal["weak", "developing", "good", "strong"]
ActionPriority = Literal["low", "medium", "high", "urgent"]
DueStatus = Literal["on_track", "due_soon", "overdue", "unknown"]


class IntelligenceRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    home_id: int | str | None = None
    child_id: int | str | None = None
    staff_id: int | str | None = None
    date_from: str | None = None
    date_to: str | None = None
    mode: IntelligenceMode | None = None
    scope: Literal["home", "child", "manager_brief", "inspection"] = "home"
    records: list[dict[str, Any]] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)
    days: int = Field(default=30, ge=1, le=365)
    include_live_records: bool = True
    include_demo_fallback: bool = False
    include_evidence_graph: bool = True
    include_patterns: bool = True
    include_ofsted_simulation: bool = True
    include_record_quality: bool = True
    use_snapshot_cache: bool = True


class IntelligenceSummary(BaseModel):
    headline: str = "records indicate intelligence is available for calm manager review"
    evidence_status: str = "mixed"
    areas_reviewed: list[str] = Field(default_factory=list)
    manager_oversight_count: int = 0
    pattern_count: int = 0
    priority_action_count: int = 0
    regulatory_alignment_note: str = (
        "Aligned to Children's Homes Regulations 2015, Quality Standards and SCCIF review prompts only."
    )


class IntelligenceFinding(BaseModel):
    id: str
    area: str
    severity: Severity = "medium"
    title: str
    summary: str
    evidence_status: str = "review recommended"
    linked_records: list[str] = Field(default_factory=list)
    regulatory_links: list[str] = Field(default_factory=list)
    sccif_links: list[str] = Field(default_factory=list)
    quality_standard_links: list[str] = Field(default_factory=list)
    recommended_review: str = "review recommended"
    manager_review_required: bool = False
    human_review_notice: str = "do not treat as a final decision"


class IntelligenceAction(BaseModel):
    id: str
    title: str
    priority: ActionPriority = "medium"
    owner_role: str = "registered_manager"
    reason: str
    linked_finding_ids: list[str] = Field(default_factory=list)
    suggested_next_step: str
    due_status: DueStatus = "unknown"


class EvidenceGraphNode(BaseModel):
    id: str
    type: str
    title: str
    summary: str = ""
    date: str | None = None
    child_id: int | str | None = None
    staff_id: int | str | None = None
    source_id: str | None = None
    regulatory_links: list[str] = Field(default_factory=list)
    evidence_strength: EvidenceStrength = "emerging"


class EvidenceGraphLink(BaseModel):
    source: str
    target: str
    relationship: str
    reason: str = ""


class EvidenceGraphResponse(BaseModel):
    nodes: list[EvidenceGraphNode] = Field(default_factory=list)
    links: list[EvidenceGraphLink] = Field(default_factory=list)
    missing_expected_links: list[str] = Field(default_factory=list)
    evidence_gaps: list[str] = Field(default_factory=list)
    graph_summary: str = ""
    manager_review_prompts: list[str] = Field(default_factory=list)


class PatternFinding(BaseModel):
    pattern_type: str
    severity: Severity = "medium"
    summary: str
    linked_records: list[str] = Field(default_factory=list)
    possible_triggers: list[str] = Field(default_factory=list)
    recommended_reviews: list[str] = Field(default_factory=list)
    regulatory_links: list[str] = Field(default_factory=list)
    sccif_links: list[str] = Field(default_factory=list)
    manager_review_required: bool = False
    safe_language_notice: str = "records indicate a pattern for review; do not treat as a final decision"


class OfstedJudgementSimulation(BaseModel):
    judgement_area: str
    evidence_strength: EvidenceStrength = "limited"
    likely_strengths: list[str] = Field(default_factory=list)
    likely_challenges: list[str] = Field(default_factory=list)
    missing_evidence: list[str] = Field(default_factory=list)
    contradictions: list[str] = Field(default_factory=list)
    records_to_review: list[str] = Field(default_factory=list)
    manager_actions: list[str] = Field(default_factory=list)
    inspection_questions: list[str] = Field(default_factory=list)
    disclaimer: str = (
        "Simulation of evidence strength only. This does not provide an Ofsted grade or inspection outcome."
    )


class ManagerDailyBrief(BaseModel):
    headline: str = "records indicate areas may need calm manager review today"
    urgent_review: list[str] = Field(default_factory=list)
    safeguarding_signals: list[str] = Field(default_factory=list)
    children_to_review: list[str] = Field(default_factory=list)
    staff_support_signals: list[str] = Field(default_factory=list)
    records_needing_signoff: list[str] = Field(default_factory=list)
    overdue_actions: list[str] = Field(default_factory=list)
    ofsted_evidence_risks: list[str] = Field(default_factory=list)
    quality_of_recording: list[str] = Field(default_factory=list)
    positive_progress: list[str] = Field(default_factory=list)
    suggested_manager_actions: list[str] = Field(default_factory=list)
    decision_support_notice: str = SAFE_DECISION_SUPPORT_NOTICE


class IntelligenceMetadata(BaseModel):
    live_records_requested: bool = False
    live_records_found: int = 0
    supplied_records_found: int = 0
    total_records_analysed: int = 0
    collector_warnings: list[str] = Field(default_factory=list)
    generated_at: str = ""
    mode: str = "home"
    snapshot: dict[str, Any] = Field(default_factory=dict)


class RecordQualityReview(BaseModel):
    record_id: str
    record_type: str
    overall_quality: RecordQuality = "developing"
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    missing_elements: list[str] = Field(default_factory=list)
    therapeutic_language_flags: list[str] = Field(default_factory=list)
    child_voice_present: bool = False
    manager_review_required: bool = False
    suggested_rewrite_guidance: list[str] = Field(default_factory=list)


class IntelligenceSpineResponse(BaseModel):
    metadata: IntelligenceMetadata = Field(default_factory=IntelligenceMetadata)
    manager_daily_brief: ManagerDailyBrief | None = None
    summary: IntelligenceSummary = Field(default_factory=IntelligenceSummary)
    child_intelligence: list[IntelligenceFinding] = Field(default_factory=list)
    safeguarding_intelligence: list[IntelligenceFinding] = Field(default_factory=list)
    ofsted_intelligence: list[IntelligenceFinding] = Field(default_factory=list)
    leadership_intelligence: list[IntelligenceFinding] = Field(default_factory=list)
    staff_intelligence: list[IntelligenceFinding] = Field(default_factory=list)
    record_quality: list[RecordQualityReview] = Field(default_factory=list)
    patterns: list[PatternFinding] = Field(default_factory=list)
    evidence_graph: EvidenceGraphResponse = Field(default_factory=EvidenceGraphResponse)
    priority_actions: list[IntelligenceAction] = Field(default_factory=list)
    inspection_risks: list[IntelligenceFinding] = Field(default_factory=list)
    what_has_improved: list[str] = Field(default_factory=list)
    what_has_deteriorated: list[str] = Field(default_factory=list)
    manager_review_required: list[str] = Field(default_factory=list)
    ofsted_simulation: list[OfstedJudgementSimulation] = Field(default_factory=list)
    regulatory_ontology: dict[str, Any] = Field(default_factory=dict)
    ofsted_readiness: dict[str, Any] = Field(default_factory=dict)
    decision_support_notice: str = SAFE_DECISION_SUPPORT_NOTICE
