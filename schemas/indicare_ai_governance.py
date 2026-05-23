"""IndiCare Intelligence AI governance and observability schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

AiGovernanceMetricPeriod = Literal["24h", "7d", "30d", "90d", "all"]

AiGovernanceSurface = Literal[
    "standalone_orb",
    "operational_orb",
    "knowledge_library",
    "document_understanding",
    "agents",
    "deep_research",
    "saved_outputs",
    "operational_outputs",
    "intelligence_actions",
    "model_router",
]

AiGovernanceRiskLevel = Literal["info", "low", "medium", "high", "critical"]


class AiGovernanceUsageMetric(BaseModel):
    model_config = ConfigDict(extra="ignore")

    total_events: int = 0
    events_by_surface: dict[str, int] = Field(default_factory=dict)
    events_by_task_type: dict[str, int] = Field(default_factory=dict)
    standalone_requests: int = 0
    operational_requests: int = 0
    agent_runs: int = 0
    deep_research_runs: int = 0
    document_analyses: int = 0
    fallback_rate: float = 0.0
    average_latency_ms: float | None = None
    model_provider_distribution: dict[str, int] = Field(default_factory=dict)
    model_name_distribution: dict[str, int] = Field(default_factory=dict)


class AiGovernanceQualityMetric(BaseModel):
    model_config = ConfigDict(extra="ignore")

    average_quality_score: float | None = None
    low_quality_output_count: int = 0
    missing_citation_count: int = 0
    citation_coverage: float = 0.0
    evaluation_count: int = 0


class AiGovernanceCostMetric(BaseModel):
    model_config = ConfigDict(extra="ignore")

    estimated_cost_tier_summary: dict[str, int] = Field(default_factory=dict)
    quality_tier_summary: dict[str, int] = Field(default_factory=dict)
    fallback_count: int = 0


class AiGovernanceSafetyMetric(BaseModel):
    model_config = ConfigDict(extra="ignore")

    high_risk_prompt_count: int = 0
    safeguarding_flag_count: int = 0
    boundary_warning_count: int = 0
    high_risk_event_count: int = 0
    safety_flags_by_type: dict[str, int] = Field(default_factory=dict)


class AiGovernanceCitationMetric(BaseModel):
    model_config = ConfigDict(extra="ignore")

    citation_coverage: float = 0.0
    average_citation_count: float = 0.0
    official_source_usage_count: int = 0
    summary_only_source_count: int = 0
    missing_citation_events: int = 0


class AiGovernanceSourceMetric(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sources_needing_review_count: int = 0
    expired_sources_count: int = 0
    summary_only_source_count: int = 0
    official_sources_count: int = 0
    sources_needing_review: list[dict[str, Any]] = Field(default_factory=list)


class AiGovernanceOutputMetric(BaseModel):
    model_config = ConfigDict(extra="ignore")

    saved_outputs_count: int = 0
    operational_outputs_count: int = 0
    awaiting_review_count: int = 0
    actions_created_count: int = 0


class AiGovernanceActionMetric(BaseModel):
    model_config = ConfigDict(extra="ignore")

    actions_created_count: int = 0
    actions_from_ai_count: int = 0
    proposed_actions_count: int = 0


class AiGovernanceAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    level: AiGovernanceRiskLevel = "info"
    title: str
    message: str
    surface: AiGovernanceSurface | None = None
    created_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiGovernancePrivacyMetric(BaseModel):
    model_config = ConfigDict(extra="ignore")

    privacy_guard_decisions: int = 0
    denied_attempts: int = 0
    redaction_applied_count: int = 0
    minimisation_applied_count: int = 0
    standalone_os_context_blocked: int = 0
    raw_record_blocked: int = 0
    child_scoped_attempts: int = 0
    safeguarding_review_required: int = 0
    manager_review_required: int = 0
    export_attempts: int = 0
    model_send_blocked: int = 0


class AiGovernanceDashboardSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    total_ai_requests: int = 0
    standalone_requests: int = 0
    operational_requests: int = 0
    agent_runs: int = 0
    deep_research_runs: int = 0
    document_analyses: int = 0
    saved_outputs_count: int = 0
    operational_outputs_count: int = 0
    awaiting_review_count: int = 0
    actions_created_count: int = 0
    sources_needing_review_count: int = 0
    expired_sources_count: int = 0
    summary_only_source_count: int = 0
    average_quality_score: float | None = None
    citation_coverage: float = 0.0
    fallback_rate: float = 0.0
    high_risk_prompt_count: int = 0
    safeguarding_flag_count: int = 0
    boundary_warning_count: int = 0
    estimated_cost_tier_summary: dict[str, int] = Field(default_factory=dict)
    average_latency_ms: float | None = None
    privacy_guard_decisions: int = 0
    privacy_denied_attempts: int = 0
    privacy_redaction_applied: int = 0
    privacy_minimisation_applied: int = 0


class AiGovernanceHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: Literal["ready", "degraded", "unavailable"] = "ready"
    storage_mode: str = "memory"
    events_table_available: bool = False
    database_available: bool = True
    provider_status: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    privacy_notice: str = (
        "Governance telemetry uses metadata and summaries only. "
        "Raw care record bodies and full prompts are not stored by default."
    )


class AiGovernanceFilter(BaseModel):
    model_config = ConfigDict(extra="ignore")

    period: AiGovernanceMetricPeriod = "7d"
    surface: AiGovernanceSurface | None = None
    home_id: int | None = None
    risk_level: AiGovernanceRiskLevel | None = None
    event_type: str | None = None
    limit: int = Field(default=50, ge=1, le=500)


class AiGovernanceEventCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    surface: AiGovernanceSurface
    event_type: str
    user_id: str | None = None
    user_role: str | None = None
    home_id: int | None = None
    child_id: int | None = None
    staff_id: int | None = None
    output_id: str | None = None
    action_id: str | None = None
    source_id: str | None = None
    model_provider: str | None = None
    model_name: str | None = None
    task_type: str | None = None
    quality_tier: str | None = None
    cost_tier: str | None = None
    latency_ms: int | None = None
    fallback_used: bool = False
    evaluation_score: float | None = None
    citation_count: int = 0
    official_source_count: int = 0
    summary_only_source_count: int = 0
    safety_flags: list[str] = Field(default_factory=list)
    boundary_warnings: list[str] = Field(default_factory=list)
    risk_level: AiGovernanceRiskLevel = "info"
    message_summary: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiGovernanceEventRecord(AiGovernanceEventCreate):
    model_config = ConfigDict(extra="ignore")

    id: str
    created_at: datetime


class AiGovernanceDashboardResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: AiGovernanceDashboardSummary
    privacy: AiGovernancePrivacyMetric = Field(default_factory=AiGovernancePrivacyMetric)
    usage: AiGovernanceUsageMetric
    quality: AiGovernanceQualityMetric
    cost: AiGovernanceCostMetric
    safety: AiGovernanceSafetyMetric
    citations: AiGovernanceCitationMetric
    sources: AiGovernanceSourceMetric
    outputs: AiGovernanceOutputMetric
    actions: AiGovernanceActionMetric
    alerts: list[AiGovernanceAlert] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    recent_events: list[AiGovernanceEventRecord] = Field(default_factory=list)
    health: AiGovernanceHealth
    degraded: bool = False
    warning: str | None = None
