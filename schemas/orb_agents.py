"""Standalone ORB agent framework schemas — no OS record access."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

OrbAgentType = Literal[
    "document_analysis",
    "deep_research",
    "policy_comparison",
    "general_assistant",
]

OrbAgentSourceKind = Literal[
    "user_uploaded",
    "knowledge_library",
    "source_packs",
    "built_in",
]


class OrbAgentCapability(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    label: str
    description: str | None = None


class OrbAgentDefinition(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    agent_type: OrbAgentType
    description: str
    capabilities: list[OrbAgentCapability] = Field(default_factory=list)
    allowed_sources: list[OrbAgentSourceKind] = Field(default_factory=list)
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False


class OrbAgentRunRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    agent_id: str = Field(..., min_length=1, max_length=80)
    message: str = Field(..., min_length=1, max_length=12000)
    mode: str | None = Field(default=None, max_length=80)
    source_id: str | None = Field(default=None, max_length=120)
    document_text: str | None = Field(default=None, max_length=500_000)
    document_title: str | None = Field(default=None, max_length=500)
    analysis_mode: str | None = Field(default=None, max_length=80)


class OrbAgentRunResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    agent_id: str
    agent_type: OrbAgentType
    answer: str
    understanding: dict[str, Any] | None = None
    sources: list[dict[str, Any]] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    context_used: dict[str, Any] = Field(default_factory=dict)
    evaluation: dict[str, Any] | None = None
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False


class OrbAgentHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ready"
    agent_count: int = 0
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False
