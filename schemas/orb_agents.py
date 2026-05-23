"""Pydantic models for standalone ORB specialist agents (no OS record access)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

OrbAgentType = Literal[
    "deep_research",
    "ofsted_research",
    "recording_quality",
    "safeguarding_reflection",
    "policy_comparison",
    "manager_briefing",
    "therapeutic_practice",
    "general_research",
    "document_analysis",
]

OrbAgentRiskLevel = Literal["low", "medium", "high", "safeguarding_sensitive"]

OrbAgentStatus = Literal["ready", "running", "completed", "failed", "unavailable"]

OrbAgentOutputFormat = Literal[
    "answer",
    "briefing",
    "checklist",
    "comparison",
    "action_plan",
    "supervision_guide",
    "evidence_map",
]

OrbAgentDepth = Literal["quick", "standard", "deep"]


class OrbAgentCapability(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    description: str


class OrbAgentDefinition(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    type: OrbAgentType
    description: str
    capabilities: list[OrbAgentCapability] = Field(default_factory=list)
    allowed_sources: list[str] = Field(default_factory=list)
    allowed_tools: list[str] = Field(default_factory=list)
    risk_level: OrbAgentRiskLevel = "medium"
    requires_citations: bool = True
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False
    output_formats: list[OrbAgentOutputFormat] = Field(default_factory=list)
    safety_notice: str | None = None


class OrbAgentAttachment(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = None
    content: str | None = Field(default=None, max_length=500_000)
    data_url: str | None = Field(default=None, max_length=2_500_000)


class OrbAgentRunRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    agent_type: OrbAgentType | None = None
    prompt: str = Field(..., min_length=1, max_length=12000)
    mode: str | None = Field(default=None, max_length=80)
    project_context: str | None = Field(default=None, max_length=8000)
    profile_context: str | None = Field(default=None, max_length=8000)
    attachments: list[OrbAgentAttachment] = Field(default_factory=list)
    preferred_output: OrbAgentOutputFormat = "answer"
    depth: OrbAgentDepth = "standard"
    require_citations: bool = True
    max_sources: int = Field(default=8, ge=1, le=20)


class OrbAgentSourceUse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    source_id: str | None = None
    label: str
    type: str | None = None
    basis: str | None = None
    excerpt: str | None = None
    confidence: str | None = None


class OrbAgentFinding(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    summary: str
    evidence: str | None = None
    source_ids: list[str] = Field(default_factory=list)
    confidence: str = "medium"
    implications: str | None = None
    suggested_actions: list[str] = Field(default_factory=list)


class OrbAgentStep(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    label: str
    status: OrbAgentStatus = "completed"
    detail: str | None = None


class OrbAgentOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    format: OrbAgentOutputFormat = "answer"
    body: str
    structured_sections: dict[str, Any] = Field(default_factory=dict)


class OrbAgentRunResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool = True
    agent_type: OrbAgentType
    status: OrbAgentStatus = "completed"
    output: OrbAgentOutput
    findings: list[OrbAgentFinding] = Field(default_factory=list)
    sources: list[dict[str, Any]] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    steps: list[OrbAgentStep] = Field(default_factory=list)
    context_used: dict[str, Any] = Field(default_factory=dict)
    model_routing: dict[str, Any] | None = None
    warnings: list[str] = Field(default_factory=list)
    safety_notice: str | None = None


class OrbDeepResearchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    query: str = Field(..., min_length=1, max_length=12000)
    mode: str | None = Field(default=None, max_length=80)
    depth: OrbAgentDepth = "standard"
    preferred_output: OrbAgentOutputFormat = "briefing"
    project_context: str | None = Field(default=None, max_length=8000)
    profile_context: str | None = Field(default=None, max_length=8000)
    require_citations: bool = True
    max_sources: int = Field(default=8, ge=1, le=20)


class OrbDeepResearchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool = True
    query: str
    depth: OrbAgentDepth
    output: OrbAgentOutput
    findings: list[OrbAgentFinding] = Field(default_factory=list)
    sources: list[dict[str, Any]] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    source_clusters: list[dict[str, Any]] = Field(default_factory=list)
    source_gaps: list[str] = Field(default_factory=list)
    steps: list[OrbAgentStep] = Field(default_factory=list)
    context_used: dict[str, Any] = Field(default_factory=dict)
    model_routing: dict[str, Any] | None = None
    warnings: list[str] = Field(default_factory=list)
    safety_notice: str | None = None
    live_web_note: str | None = None


class OrbAgentHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: OrbAgentStatus = "ready"
    agent_count: int = 0
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False
    live_web_retrieval_enabled: bool = False
    knowledge_library_available: bool = True
    model_router_available: bool = True
