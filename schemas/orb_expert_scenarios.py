"""Pydantic models for ORB expert stress-test scenario matrix and evaluation."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


RiskLevel = Literal["low", "medium", "high", "critical"]
ScenarioRole = Literal[
    "support_worker",
    "senior_support_worker",
    "deputy_manager",
    "registered_manager",
    "responsible_individual",
    "provider",
    "reg44_visitor",
    "social_worker",
    "nvq_assessor",
    "nvq_learner",
    "trainer_consultant",
]
OutputMode = Literal[
    "what_am_i_missing",
    "record_this_properly",
    "safeguarding_lens",
    "ofsted_lens",
    "reg44_questions",
    "manager_oversight",
    "chronology_suggestion",
    "shift_handover",
    "reflective_learning",
    "nvq_evidence_mapping",
    "action_plan",
    "policy_card",
    "staff_supervision",
    "ri_governance",
]


class OrbScenarioFamily(BaseModel):
    id: str
    label: str
    description: str
    common_triggers: list[str] = Field(default_factory=list)
    red_flags: list[str] = Field(default_factory=list)
    default_risk_level: RiskLevel = "medium"
    likely_roles: list[str] = Field(default_factory=list)
    likely_source_anchors: list[str] = Field(default_factory=list)
    expected_lenses: list[str] = Field(default_factory=list)
    typical_records: list[str] = Field(default_factory=list)
    typical_actions: list[str] = Field(default_factory=list)
    typical_manager_oversight: list[str] = Field(default_factory=list)
    typical_reg44_questions: list[str] = Field(default_factory=list)
    typical_nvq_learning: list[str] = Field(default_factory=list)


class OrbScenarioModifierSet(BaseModel):
    child_profile: list[str] = Field(default_factory=list)
    home_context: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    role: list[str] = Field(default_factory=list)
    output_mode: list[str] = Field(default_factory=list)


class OrbExpertScenario(BaseModel):
    scenario_id: str
    title: str
    family: str
    role: ScenarioRole
    risk_level: RiskLevel
    prompt: str
    child_profile: list[str] = Field(default_factory=list)
    context_modifiers: list[str] = Field(default_factory=list)
    evidence_gaps: list[str] = Field(default_factory=list)
    expected_markers: list[str] = Field(default_factory=list)
    optional_markers: list[str] = Field(default_factory=list)
    must_not_say: list[str] = Field(default_factory=list)
    source_anchors: list[str] = Field(default_factory=list)
    expected_actions: list[str] = Field(default_factory=list)
    expected_recording_points: list[str] = Field(default_factory=list)
    expected_manager_oversight: list[str] = Field(default_factory=list)
    expected_reg44_questions: list[str] = Field(default_factory=list)
    expected_nvq_evidence: list[str] = Field(default_factory=list)
    output_modes_to_test: list[str] = Field(default_factory=list)
    generated: bool = False
    needs_human_review: bool = False
    generated_by: str | None = None
    source_scenario_id: str | None = None


class OrbScenarioEvaluationRubric(BaseModel):
    dimensions: list[str] = Field(default_factory=list)
    pass_threshold: int = 70
    critical_fail_patterns: list[str] = Field(default_factory=list)


class OrbScenarioEvaluationResult(BaseModel):
    passed: bool
    score: int = Field(ge=0, le=100)
    missing_required_markers: list[str] = Field(default_factory=list)
    unsafe_phrases_found: list[str] = Field(default_factory=list)
    overclaiming_found: list[str] = Field(default_factory=list)
    source_anchor_gaps: list[str] = Field(default_factory=list)
    role_fit_score: int = Field(ge=0, le=100, default=0)
    child_voice_score: int = Field(ge=0, le=100, default=0)
    recording_quality_score: int = Field(ge=0, le=100, default=0)
    safeguarding_score: int = Field(ge=0, le=100, default=0)
    manager_oversight_score: int = Field(ge=0, le=100, default=0)
    ofsted_reg44_score: int = Field(ge=0, le=100, default=0)
    academy_nvq_score: int = Field(ge=0, le=100, default=0)
    notes: list[str] = Field(default_factory=list)
    scenario_id: str | None = None


class OrbSourceRegistryEntry(BaseModel):
    source_id: str
    label: str
    title: str
    publisher: str
    jurisdiction: str = "England"
    source_type: str
    url: str = ""
    last_checked: str = ""
    applies_to: list[str] = Field(default_factory=list)
    exact_text_available: bool = False
    summary_basis: str = ""
    when_to_cite: list[str] = Field(default_factory=list)
    scenario_families: list[str] = Field(default_factory=list)
    regulation_numbers: list[str] = Field(default_factory=list)
    citation_labels: list[str] = Field(default_factory=list)
    confidence: str = "high"
    notes: str = ""
    must_not_overclaim: str = ""


class OrbCitationDecision(BaseModel):
    source_id: str
    citation_label: str
    why_cited: str
    exact_text_available: bool = False
    source_url: str = ""
    basis_type: str = "summary"
    confidence: str = "high"


class OrbGeneratedScenarioVariant(OrbExpertScenario):
    generated: bool = True
    needs_human_review: bool = True
