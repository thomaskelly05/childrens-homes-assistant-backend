"""Handover intelligence — metadata-only shift operating rhythm for the OS workspace."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

HandoverScopeType = Literal["home", "child", "shift", "user"]
HandoverSectionType = Literal[
    "overview",
    "safeguarding",
    "recording_alerts",
    "reviews",
    "actions",
    "child_updates",
    "health_medication",
    "education_family",
    "missing_risk",
    "environment",
    "staff_wellbeing",
    "staff_shift",
    "manager_notes",
    "next_shift_priorities",
]
HandoverPriority = Literal["low", "medium", "high", "urgent"]


class HandoverScope(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: HandoverScopeType = "home"
    home_id: int | None = None
    child_id: int | None = None
    user_id: str | None = None


class HandoverIntelligenceItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    safe_summary: str
    section_type: HandoverSectionType = "overview"
    priority: HandoverPriority = "medium"
    source: str = "handover"
    route: str = "/handover"
    action_label: str | None = None
    child_id: int | None = None
    child_name: str | None = None
    home_id: int | None = None
    related_id: str | None = None
    related_type: str | None = None
    safeguarding_sensitive: bool = False
    manager_review_required: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class HandoverIntelligenceSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    section_type: HandoverSectionType
    summary: str
    items: list[HandoverIntelligenceItem] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    route: str = "/handover"
    action_label: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class HandoverIntelligenceRoutes(BaseModel):
    model_config = ConfigDict(extra="ignore")

    handover: str = "/handover"
    current: str = "/handover/current"
    alerts: str = "/record/alerts"
    reviews: str = "/record/reviews"
    governance: str = "/record/governance"
    safeguarding: str = "/safeguarding"
    briefing: str = "/command-centre/briefing"
    care_hub: str = "/command-centre"
    actions: str = "/actions"
    orb: str = "/assistant/orb?mode=manager_daily_brief"


class HandoverIntelligenceDashboard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated_at: str
    scope: HandoverScope
    shift_label: str = "Current shift"
    home_id: int | None = None
    child_id: int | None = None
    summary: str = ""
    sections: list[HandoverIntelligenceSection] = Field(default_factory=list)
    urgent_count: int = 0
    safeguarding_count: int = 0
    review_count: int = 0
    action_count: int = 0
    recording_alert_count: int = 0
    isn_count: int = 0
    recommendations: list[str] = Field(default_factory=list)
    privacy_notice: str = ""
    limitations: list[str] = Field(default_factory=list)
    orb_prompts: list[dict[str, str]] = Field(default_factory=list)
    routes: HandoverIntelligenceRoutes = Field(default_factory=HandoverIntelligenceRoutes)
    metadata: dict[str, Any] = Field(default_factory=dict)


class HandoverHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    service: str = "handover_intelligence_service"
    storage_mode: str = "memory"
    persistence_available: bool = False
    draft_count: int = 0
    operational_only: bool = True
    standalone_access: bool = False
    metadata_only: bool = True
