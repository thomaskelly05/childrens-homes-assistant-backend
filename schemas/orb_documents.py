"""Pydantic models for standalone ORB document understanding (no OS record access)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

OrbDocumentAnalysisMode = Literal[
    "explain",
    "summarise",
    "action_plan",
    "ofsted_lens",
    "safeguarding_lens",
    "recording_lens",
    "therapeutic_lens",
    "policy_comparison",
    "manager_briefing",
    "staff_briefing",
    "full_review",
]

OrbDocumentLens = Literal[
    "summary",
    "explain",
    "actions",
    "policy_card",
    "reg44",
    "reg45",
    "ofsted",
    "safeguarding",
    "recording_quality",
    "manager_oversight",
    "ri_governance",
    "staff_briefing",
    "supervision",
    "checklist",
    "what_is_missing",
]

OrbDocumentActionPriority = Literal["low", "medium", "high", "urgent"]


class OrbStandaloneBoundaryMixin(BaseModel):
    model_config = ConfigDict(extra="ignore")

    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False


class OrbDocumentKeyPoint(BaseModel):
    model_config = ConfigDict(extra="ignore")

    point: str
    detail: str | None = None
    source_basis: str | None = None


class OrbDocumentRisk(BaseModel):
    model_config = ConfigDict(extra="ignore")

    risk: str
    severity: str | None = None
    mitigation: str | None = None
    source_basis: str | None = None


class OrbDocumentGap(BaseModel):
    model_config = ConfigDict(extra="ignore")

    gap: str
    why_it_matters: str | None = None
    suggested_update: str | None = None


class OrbDocumentAction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    action: str
    why_it_matters: str | None = None
    priority: OrbDocumentActionPriority = "medium"
    suggested_owner_label: str | None = None
    timescale: str | None = None
    source_basis: str | None = None
    review_needed: bool = True


class OrbDocumentQuestion(BaseModel):
    model_config = ConfigDict(extra="ignore")

    question: str
    purpose: str | None = None


class OrbDocumentPracticeImplication(BaseModel):
    model_config = ConfigDict(extra="ignore")

    implication: str
    for_role: str | None = None
    source_basis: str | None = None


class OrbDocumentEvidenceImplication(BaseModel):
    model_config = ConfigDict(extra="ignore")

    implication: str
    evidence_type: str | None = None
    source_basis: str | None = None


class OrbDocumentActionPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: str | None = None
    actions: list[OrbDocumentAction] = Field(default_factory=list)
    review_note: str | None = None


class OrbDocumentUploadRequest(OrbStandaloneBoundaryMixin):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., min_length=1, max_length=500)
    text: str | None = Field(default=None, max_length=500_000)
    content_base64: str | None = Field(default=None, max_length=8_000_000)
    file_name: str | None = Field(default=None, max_length=300)
    content_type: str | None = Field(default=None, max_length=120)
    source_type: str | None = Field(default=None, max_length=80)
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbDocumentUploadResponse(OrbStandaloneBoundaryMixin):
    model_config = ConfigDict(extra="ignore")

    source_id: str
    title: str
    chunk_count: int
    source_type: str | None = None
    status: str = "indexed"


class OrbDocumentAnalysisRequest(OrbStandaloneBoundaryMixin):
    model_config = ConfigDict(extra="ignore")

    mode: OrbDocumentAnalysisMode = "explain"
    lens: OrbDocumentLens | None = None
    source_id: str | None = Field(default=None, max_length=120)
    title: str | None = Field(default=None, max_length=500)
    text: str | None = Field(default=None, max_length=500_000)
    question: str | None = Field(default=None, max_length=4000)
    include_evaluation: bool = True
    save_output: bool = False
    project_id: str | None = Field(default=None, max_length=120)
    project_name: str | None = Field(default=None, max_length=500)
    profile_ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    save_title: str | None = Field(default=None, max_length=500)
    save_output_type: str | None = Field(default=None, max_length=80)


class OrbDocumentUnderstanding(OrbStandaloneBoundaryMixin):
    model_config = ConfigDict(extra="ignore")

    title: str
    plain_english_summary: str
    document_type: str | None = None
    likely_purpose: str | None = None
    key_themes: list[str] = Field(default_factory=list)
    important_points: list[OrbDocumentKeyPoint] = Field(default_factory=list)
    who_needs_to_know: list[str] = Field(default_factory=list)
    practice_implications: list[OrbDocumentPracticeImplication] = Field(default_factory=list)
    evidence_implications: list[OrbDocumentEvidenceImplication] = Field(default_factory=list)
    risks_or_concerns: list[OrbDocumentRisk] = Field(default_factory=list)
    gaps_or_missing_information: list[OrbDocumentGap] = Field(default_factory=list)
    suggested_questions: list[OrbDocumentQuestion] = Field(default_factory=list)
    action_plan: OrbDocumentActionPlan | None = None
    citations: list[dict[str, Any]] = Field(default_factory=list)
    sources: list[dict[str, Any]] = Field(default_factory=list)
    model_routing: dict[str, Any] | None = None
    safety_notice: str | None = None
    limitations: list[str] = Field(default_factory=list)
    analysis_mode: OrbDocumentAnalysisMode = "explain"
    source_id: str | None = None
    evaluation: dict[str, Any] | None = None


class OrbDocumentAnalysisResponse(OrbStandaloneBoundaryMixin):
    model_config = ConfigDict(extra="ignore")

    understanding: OrbDocumentUnderstanding
    success: bool = True


class OrbDocumentHealth(OrbStandaloneBoundaryMixin):
    model_config = ConfigDict(extra="ignore")

    status: str = "ready"
    service: str = "orb_document_understanding"
    supported_modes: list[str] = Field(default_factory=list)
    supported_upload_types: list[str] = Field(default_factory=lambda: [".txt", ".md", ".pdf", ".docx"])
