"""ORB Evaluation & Red Team Platform schemas."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

OrbEvaluationRunMode = Literal["template", "internal-brain", "live-llm"]
OrbEvaluationPackType = Literal["standard", "high-risk", "adversarial", "custom", "retest"]
OrbEvaluationRunStatus = Literal["queued", "running", "completed", "failed", "interrupted"]


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
    internal_brain: dict[str, Any] | None = None


class OrbEvaluationRunRecord(BaseModel):
    id: str
    status: OrbEvaluationRunStatus
    mode: OrbEvaluationRunMode
    pack: OrbEvaluationPackType
    title: str
    scenario_count: int
    completed_count: int = 0
    critical_failures: int = 0
    started_at: str
    completed_at: str | None = None
    created_by: str | None = None
    error: str | None = None


class OrbEvaluationRunCreateResponse(BaseModel):
    run: OrbEvaluationRunRecord


class OrbEvaluationProcessResponse(BaseModel):
    run_id: str
    status: OrbEvaluationRunStatus
    completed_count: int
    scenario_count: int
    critical_failures: int
    next_batch_available: bool
    batch_results: list[OrbEvaluationScenarioResult] = Field(default_factory=list)
    error: str | None = None
    success: bool = True
    code: str | None = None
    retryable: bool = False
    retry_after_ms: int | None = Field(default=None, alias="retryAfterMs")

    model_config = {"populate_by_name": True}


class OrbEvaluationRunResponse(BaseModel):
    run_id: str
    title: str
    mode: OrbEvaluationRunMode
    status: Literal["completed", "failed", "queued", "running"]
    scenario_count: int
    completed_count: int
    live_llm_available: bool
    scenario_results: list[OrbEvaluationScenarioResult]
    limitations: list[str] = Field(default_factory=list)
    error: str | None = None
    run: OrbEvaluationRunRecord | None = None


class OrbEvaluationRetestRequest(BaseModel):
    scenario_ids: list[str] | None = None
    mode: OrbEvaluationRunMode = "live-llm"


class OrbEvaluationOverview(BaseModel):
    live_llm_available: bool
    internal_brain_available: bool = True
    scenario_template_count: int
    supported_pack_types: list[str]
    supported_modes: list[str] = Field(
        default_factory=lambda: ["template", "internal-brain", "live-llm"]
    )
    limitations: list[str] = Field(default_factory=list)
