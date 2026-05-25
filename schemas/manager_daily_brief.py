"""Manager daily brief — metadata-only decision support for Care Hub and briefing page."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ManagerDailyBriefScopeType = Literal["home", "user", "provider"]
ManagerDailyBriefTone = Literal["neutral", "attention", "urgent", "positive"]


class ManagerDailyBriefScope(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: ManagerDailyBriefScopeType = "provider"
    home_id: int | None = None
    user_id: str | None = None
    provider_id: int | None = None


class ManagerDailyBriefItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    safe_summary: str
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    route: str
    action_label: str | None = None
    source: str = "recording_alerts"
    child_id: int | None = None
    child_name: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ManagerDailyBriefSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    summary: str
    items: list[ManagerDailyBriefItem] = Field(default_factory=list)
    route: str
    action_label: str | None = None
    tone: ManagerDailyBriefTone = "neutral"
    metadata: dict[str, Any] = Field(default_factory=dict)


class ManagerDailyBriefRoutes(BaseModel):
    model_config = ConfigDict(extra="ignore")

    alerts: str = "/record/alerts"
    reviews: str = "/record/reviews"
    governance: str = "/record/governance"
    actions: str = "/actions"
    handover: str = "/handover/current"
    briefing: str = "/command-centre/briefing"
    care_hub: str = "/command-centre"
    orb: str = "/assistant/orb?mode=manager_daily_brief"
    isn: str = "/safeguarding"
    isn_orb: str = "/assistant/orb?mode=safeguarding_themes"


class ManagerDailyBrief(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated_at: str
    date: str
    scope: ManagerDailyBriefScope
    title: str = "Manager daily brief"
    opening_summary: str = ""
    recording_summary: str = ""
    review_summary: str = ""
    safeguarding_summary: str = ""
    isn_summary: str = ""
    action_summary: str = ""
    child_journey_summary: str = ""
    handover_summary: str = ""
    sections: list[ManagerDailyBriefSection] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    privacy_notice: str = (
        "This brief uses metadata and flags only — not full record bodies. "
        "It supports oversight; it does not make safeguarding threshold decisions "
        "or claim inspection compliance."
    )
    orb_prompts: list[dict[str, str]] = Field(default_factory=list)
    routes: ManagerDailyBriefRoutes = Field(default_factory=ManagerDailyBriefRoutes)
    metadata: dict[str, Any] = Field(default_factory=dict)
    reviewed: bool = False
    reviewed_at: str | None = None


class ManagerDailyBriefHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    service: str = "manager_daily_brief_service"
    storage_mode: str = "memory"
    persistence_available: bool = False


class ManagerDailyBriefReviewRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    date: str | None = None
    note: str | None = None


class ManagerDailyBriefReviewResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    ok: bool = True
    reviewed: bool = True
    reviewed_at: str
    date: str
    message: str = "Daily brief marked as reviewed for today."
