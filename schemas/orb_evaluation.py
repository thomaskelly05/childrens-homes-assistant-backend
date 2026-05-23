"""Pydantic models for standalone ORB answer quality evaluation."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

OrbEvaluationDimension = Literal[
    "source_grounding",
    "citation_quality",
    "standalone_boundary",
    "child_centred_language",
    "recording_quality",
    "safeguarding_caution",
    "ofsted_relevance",
    "therapeutic_quality",
    "clarity",
    "actionability",
    "british_english",
    "no_fake_source_claims",
]


class OrbEvaluationDimensionScore(BaseModel):
    model_config = ConfigDict(extra="ignore")

    dimension: OrbEvaluationDimension
    score: float = Field(ge=0, le=1)
    note: str | None = None


class OrbEvaluationFlag(BaseModel):
    model_config = ConfigDict(extra="ignore")

    code: str
    message: str
    severity: Literal["info", "warning", "critical"] = "warning"


class OrbQualitySummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    headline: str
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)


class OrbEvaluationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    answer_text: str = Field(..., min_length=1, max_length=100_000)
    mode: str | None = Field(default=None, max_length=80)
    analysis_mode: str | None = Field(default=None, max_length=80)
    sources: list[dict[str, Any]] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    requires_action_plan: bool = False
    requires_citations: bool = False
    standalone_only: bool = True


class OrbEvaluationResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    overall_score: float = Field(ge=0, le=1)
    dimensions: list[OrbEvaluationDimensionScore] = Field(default_factory=list)
    flags: list[OrbEvaluationFlag] = Field(default_factory=list)
    passed: bool = True
    recommendations: list[str] = Field(default_factory=list)
    requires_human_review: bool = False
    safety_notes: list[str] = Field(default_factory=list)
    summary: OrbQualitySummary | None = None
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False
