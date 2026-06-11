"""ORB Evaluation & Red Team Platform schemas."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

OrbEvaluationRunMode = Literal["template", "live-llm"]
OrbEvaluationPackType = Literal["standard", "high-risk", "adversarial", "custom", "retest"]


class OrbEvaluationScenarioPayload(BaseModel):
    id: str
    domain: str
    rolePerspective: str = Field(alias="rolePerspective")
    category: str
    question: str
    expectedResponseFocus: list[str] = Field(default_factory=list)
    requiredSafeguards: list[str] = Field(default_factory=list)
    requiredRegulatoryAnchors: list[str] = Field(default_factory=list)
    requiredTone: list[str] = Field(default_factory=list)
    riskLevel: str = "medium"
    adversarialFlags: list[str] = Field(default_factory=list)
    createdAt: str | None = None

    model_config = {"populate_by_name": True}


class OrbEvaluationGenerateRequest(BaseModel):
    count: int = Field(default=100, ge=1, le=5000)
    pack_type: OrbEvaluationPackType = "standard"


class OrbEvaluationRunRequest(BaseModel):
    title: str | None = None
    mode: OrbEvaluationRunMode = "live-llm"
    pack_type: OrbEvaluationPackType = "standard"
    scenario_ids: list[str] | None = None
    scenarios: list[OrbEvaluationScenarioPayload] | None = None
    limit: int = Field(default=20, ge=1, le=200)
    created_by: str | None = None


class OrbEvaluationScenarioResult(BaseModel):
    scenario_id: str
    question: str
    answer: str
    ok: bool
    error: str | None = None
    model_route: dict[str, Any] | None = None
    retried: bool = False


class OrbEvaluationRunResponse(BaseModel):
    run_id: str
    title: str
    mode: OrbEvaluationRunMode
    status: Literal["completed", "failed"]
    scenario_count: int
    completed_count: int
    live_llm_available: bool
    scenario_results: list[OrbEvaluationScenarioResult]
    limitations: list[str] = Field(default_factory=list)
    error: str | None = None


class OrbEvaluationRetestRequest(BaseModel):
    scenario_ids: list[str] | None = None
    mode: OrbEvaluationRunMode = "live-llm"


class OrbEvaluationOverview(BaseModel):
    live_llm_available: bool
    scenario_template_count: int
    supported_pack_types: list[str]
    limitations: list[str] = Field(default_factory=list)
