"""Unified intelligence output models for standalone ORB surfaces."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

OrbIntelligenceOutputType = Literal[
    "answer",
    "document_analysis",
    "action_plan",
    "manager_briefing",
    "staff_briefing",
    "checklist",
    "comparison",
    "evidence_map",
    "deep_research",
    "safeguarding_reflection",
    "recording_rewrite",
    "therapeutic_reflection",
]


class OrbIntelligenceSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    body: str
    order: int = 0


class OrbIntelligenceAction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    action: str
    why: str | None = None
    priority: str = "medium"
    owner_label: str | None = None
    timescale: str | None = None
    source_basis: str | None = None


class OrbIntelligenceSourceSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str | None = None
    label: str
    type: str | None = None
    basis: str | None = None
    excerpt: str | None = None


class OrbIntelligenceQualitySummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    overall_score: float = Field(ge=0, le=1, default=0.75)
    passed: bool = True
    headline: str | None = None
    flags: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    requires_human_review: bool = False
    safety_notes: list[str] = Field(default_factory=list)


class OrbIntelligenceBoundary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    surface: str = "standalone"
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False
    notice: str | None = None


class OrbIntelligenceRunMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore")

    agent_type: str | None = None
    analysis_mode: str | None = None
    depth: str | None = None
    steps: list[dict[str, Any]] = Field(default_factory=list)
    model_routing: dict[str, Any] | None = None
    retrieval_context: dict[str, Any] | None = None


class OrbIntelligenceOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid4()))
    type: OrbIntelligenceOutputType = "answer"
    title: str
    summary: str
    sections: list[OrbIntelligenceSection] = Field(default_factory=list)
    key_points: list[str] = Field(default_factory=list)
    findings: list[dict[str, Any]] = Field(default_factory=list)
    actions: list[OrbIntelligenceAction] = Field(default_factory=list)
    questions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    sources: list[dict[str, Any]] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    quality: OrbIntelligenceQualitySummary | None = None
    safety_notice: str | None = None
    limitations: list[str] = Field(default_factory=list)
    boundaries: OrbIntelligenceBoundary = Field(default_factory=OrbIntelligenceBoundary)
    model_routing: dict[str, Any] | None = None
    retrieval_context: dict[str, Any] | None = None
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False
