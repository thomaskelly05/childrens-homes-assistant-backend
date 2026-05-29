"""Schemas for standalone ORB Document Intelligence layer."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

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
    "nvq_evidence_map",
    "reflective_account_plan",
    "assessor_feedback",
    "professional_discussion_prompts",
    "witness_testimony_prompt",
    "learning_action_plan",
    "workbook_summary",
    "qualification_criteria_explainer",
]

class OrbDocumentIntelligenceSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    heading: str
    body: str
    items: list[str] = Field(default_factory=list)


class OrbDocumentIntelligenceAction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    reason: str | None = None
    risk_level: str | None = None
    owner: str | None = None
    due_date: str | None = None
    evidence_needed: str | None = None
    related_lens: str | None = None
    follow_up_question: str | None = None
    manager_visibility: bool = False
    ri_visibility: bool = False
    horizon: Literal["immediate", "short_term", "governance"] = "short_term"


class OrbDocumentIntelligenceRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    document_text: str | None = Field(default=None, max_length=500_000)
    document_source_id: str | None = Field(default=None, max_length=120)
    document_title: str | None = Field(default=None, max_length=500)
    lens: OrbDocumentLens = "explain"
    mode: str | None = Field(default="Ask ORB", max_length=80)
    context: dict[str, Any] = Field(default_factory=dict)
    question: str | None = Field(default=None, max_length=4000)
    include_evaluation: bool = False


class OrbDocumentIntelligenceData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    lens: OrbDocumentLens
    title: str
    summary: str
    sections: list[OrbDocumentIntelligenceSection] = Field(default_factory=list)
    actions: list[OrbDocumentIntelligenceAction] = Field(default_factory=list)
    checklist: list[str] = Field(default_factory=list)
    confidence: str = "draft"
    sources: list[dict[str, Any]] = Field(default_factory=list)
    standalone: bool = True
    os_records_accessed: bool = False
    missing_information: list[str] = Field(default_factory=list)
    reg44: dict[str, Any] | None = None
    policy_card: dict[str, Any] | None = None
    action_plan_groups: dict[str, list[OrbDocumentIntelligenceAction]] | None = None
    understanding: dict[str, Any] | None = None


class OrbDocumentIntelligenceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool = True
    data: OrbDocumentIntelligenceData
