"""ORB Quality Lab — founder/admin scenario evaluation API models."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from schemas.orb_expert_scenarios import OrbScenarioEvaluationResult


class OrbQualityLabScenarioSummary(BaseModel):
    scenario_id: str
    title: str
    family: str
    role: str
    risk_level: str
    expected_marker_count: int = 0


class OrbQualityLabRunRequest(BaseModel):
    title: str | None = None
    family: str | None = None
    role: str | None = None
    limit: int = Field(default=20, ge=1, le=100)
    use_sample_answers: bool = True


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
    answer_source: Literal["sample-template", "manual-paste", "live-orb"] = "sample-template"
    answer_excerpt: str = ""


class OrbQualityLabRunResponse(BaseModel):
    run_id: str
    title: str
    scenario_count: int
    passed: int
    failed: int
    pass_rate: float
    route_call_skipped: bool = True
    validation_errors: list[str] = Field(default_factory=list)
    results: list[OrbQualityLabRunItemResult] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


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


class OrbQualityLabOverview(BaseModel):
    gold_scenario_count: int
    family_count: int
    validation_errors: list[str] = Field(default_factory=list)
    families: list[dict[str, str]] = Field(default_factory=list)
