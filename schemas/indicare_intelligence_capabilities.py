from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CapabilityStatus = Literal["built", "partial", "planned", "blocked"]
CapabilitySurface = Literal[
    "standalone_orb",
    "operational_orb",
    "indicare_os",
    "shared",
]
CapabilityCategory = Literal[
    "core_chat",
    "voice",
    "vision",
    "file_upload",
    "memory",
    "projects",
    "profiles",
    "tools",
    "agents",
    "deep_research",
    "citations",
    "knowledge_library",
    "saved_outputs",
    "staff_profiles",
    "child_profiles",
    "safeguarding",
    "ofsted",
    "therapeutic_practice",
    "governance",
    "wellbeing",
    "notifications",
    "collaboration",
    "accessibility",
    "mobile",
    "security",
    "operational_os_context",
]


class IndicareIntelligenceCapability(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: str
    category: CapabilityCategory
    status: CapabilityStatus
    surface: CapabilitySurface
    routes: list[str] = Field(default_factory=list)
    files: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    safety_notes: list[str] = Field(default_factory=list)


class IndicareIntelligenceCapabilitySummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    total: int
    built: int
    partial: int
    planned: int
    blocked: int
    by_category: dict[str, int]
    by_surface: dict[str, int]
    standalone_safe_count: int
    requires_os_context_count: int


class IndicareIntelligenceCapabilityListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    capabilities: list[IndicareIntelligenceCapability]
    product: str = "IndiCare Intelligence™"
    surface_scope: str = "standalone_orb_catalog"
    audit_document: str = "docs/indicare-intelligence-parity-audit.md"
