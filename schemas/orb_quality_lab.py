"""ORB Quality Lab — founder/admin scenario evaluation API models."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from schemas.orb_expert_scenarios import OrbScenarioEvaluationResult

QualityRunMode = Literal["template", "live-llm"]
ReviewStatus = Literal[
    "pending-human-review",
    "reviewed-pass",
    "reviewed-concern",
    "reviewed-fail",
    "needs-retest",
]
LaunchRecommendation = Literal["not-ready", "closed-pilot-ready", "public-launch-ready"]


class OrbQualityLabScenarioSummary(BaseModel):
    scenario_id: str
    title: str
    family: str
    role: str
    risk_level: str
    expected_marker_count: int = 0


class OrbQualityLabScoringBreakdown(BaseModel):
    safeguarding_accuracy: int = Field(ge=0, le=100, default=0)
    escalation_appropriateness: int = Field(ge=0, le=100, default=0)
    local_policy_caveat: int = Field(ge=0, le=100, default=0)
    therapeutic_tone: int = Field(ge=0, le=100, default=0)
    child_centred_language: int = Field(ge=0, le=100, default=0)
    child_voice: int = Field(ge=0, le=100, default=0)
    management_oversight: int = Field(ge=0, le=100, default=0)
    ofsted_sccif_alignment: int = Field(ge=0, le=100, default=0)
    practical_usefulness: int = Field(ge=0, le=100, default=0)
    evidence_recording_quality: int = Field(ge=0, le=100, default=0)
    hallucination_risk: int = Field(ge=0, le=100, default=0)
    completeness: int = Field(ge=0, le=100, default=0)


class OrbQualityLabHumanReview(BaseModel):
    review_status: ReviewStatus = "pending-human-review"
    reviewer: str | None = None
    review_notes: str = ""
    reviewed_at: str | None = None
    reviewer_decision: str | None = None
    required_fix: str | None = None


class OrbQualityLabRunRequest(BaseModel):
    title: str | None = None
    family: str | None = None
    role: str | None = None
    scenario_ids: list[str] | None = None
    limit: int = Field(default=20, ge=1, le=100)
    use_sample_answers: bool | None = None
    run_mode: QualityRunMode = "live-llm"

    @model_validator(mode="after")
    def _resolve_run_mode(self) -> "OrbQualityLabRunRequest":
        if self.use_sample_answers is True:
            object.__setattr__(self, "run_mode", "template")
        elif self.use_sample_answers is False:
            object.__setattr__(self, "run_mode", "live-llm")
        return self


class OrbQualityLabRunItemResult(BaseModel):
    scenario_id: str
    title: str
    family: str
    role: str
    risk_level: str
    passed: bool
    score: int = Field(ge=0, le=100)
    missing_markers: list[str] = Field(default_factory=list)
    unsafe_phrases: list[str] = Field(default_factory=list)
    overclaims: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    answer_source: Literal["sample-template", "manual-paste", "live-orb", "live-llm"] = "sample-template"
    answer_excerpt: str = ""
    generated_answer: str = ""
    run_mode: QualityRunMode = "template"
    critical_failure: bool = False
    critical_failure_reasons: list[str] = Field(default_factory=list)
    requires_human_review: bool = False
    scoring_breakdown: OrbQualityLabScoringBreakdown | None = None
    human_review: OrbQualityLabHumanReview | None = None
    live_call_error: str | None = None
    model_route: dict[str, str | None] | None = None
    retest_of_scenario_id: str | None = None


class OrbQualityLabRunResponse(BaseModel):
    run_id: str
    title: str
    scenario_count: int
    passed: int
    failed: int
    pass_rate: float
    run_mode: QualityRunMode = "template"
    route_call_skipped: bool = True
    live_llm_available: bool = False
    model_route_used: str | None = None
    critical_failures: int = 0
    pending_human_reviews: int = 0
    validation_errors: list[str] = Field(default_factory=list)
    results: list[OrbQualityLabRunItemResult] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    coverage: dict | None = None


class OrbQualityLabEvaluateRequest(BaseModel):
    scenario_id: str
    answer: str = Field(min_length=1, max_length=50000)


class OrbQualityLabEvaluateResponse(BaseModel):
    scenario_id: str
    title: str
    family: str
    role: str
    risk_level: str
    evaluation: OrbScenarioEvaluationResult
    scoring_breakdown: OrbQualityLabScoringBreakdown | None = None
    critical_failure: bool = False
    critical_failure_reasons: list[str] = Field(default_factory=list)


class OrbQualityLabOverview(BaseModel):
    gold_scenario_count: int
    family_count: int
    validation_errors: list[str] = Field(default_factory=list)
    families: list[dict[str, str]] = Field(default_factory=list)
    live_llm_available: bool = False
    default_run_mode: QualityRunMode = "live-llm"
    coverage: dict | None = None


class OrbLaunchQualityGate(BaseModel):
    live_run_completed: bool = False
    high_risk_scenarios_passed: bool = False
    critical_failures: int = 0
    pending_human_reviews: int = 0
    whistleblowing_covered: bool = False
    privacy_retention_reviewed: bool = False
    recommendation: LaunchRecommendation = "not-ready"
    blockers: list[str] = Field(default_factory=list)
