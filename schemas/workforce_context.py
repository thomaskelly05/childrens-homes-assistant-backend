"""Workforce and shift context — metadata-only safe summaries for OS operating rhythm."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

WorkforceContextScopeType = Literal["home", "shift", "staff_member", "user"]
WorkforceContextSensitivity = Literal[
    "public_operational",
    "manager_only",
    "hr_sensitive",
    "safeguarding_sensitive",
    "confidential",
]


class WorkforceContextScope(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: WorkforceContextScopeType = "home"
    home_id: int | None = None
    shift_id: str | None = None
    staff_id: int | None = None
    user_id: str | None = None


class WorkforceContextItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    safe_summary: str
    source: str = "workforce"
    route: str = "/staff"
    action_label: str | None = None
    sensitivity: WorkforceContextSensitivity = "public_operational"
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    staff_id: int | None = None
    staff_name: str | None = None
    role: str | None = None
    home_id: int | None = None
    shift_id: str | None = None
    related_id: str | None = None
    related_type: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ShiftContextSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    shift_id: str | None = None
    shift_label: str = "Current shift"
    home_id: int | None = None
    shift_lead_name: str | None = None
    shift_lead_id: int | None = None
    staff_count: int = 0
    staff_on_shift: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    route: str = "/shifts/current"
    metadata: dict[str, Any] = Field(default_factory=dict)


class WorkforceContextRoutes(BaseModel):
    model_config = ConfigDict(extra="ignore")

    staff: str = "/staff"
    staff_all: str = "/staff/all"
    staff_profile: str = "/staff"
    shifts: str = "/shifts"
    current_shift: str = "/shifts/current"
    rota: str = "/rostering"
    training: str = "/staff/training-matrix"
    supervision: str = "/staff/supervision"
    handover: str = "/handover"
    actions: str = "/actions"
    orb: str = "/assistant/orb?mode=manager_daily_brief"


class WorkforceContextDashboard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated_at: str
    scope: WorkforceContextScope
    shift: ShiftContextSummary = Field(default_factory=ShiftContextSummary)
    staff_on_shift: list[WorkforceContextItem] = Field(default_factory=list)
    actions: list[WorkforceContextItem] = Field(default_factory=list)
    training: list[WorkforceContextItem] = Field(default_factory=list)
    supervision: list[WorkforceContextItem] = Field(default_factory=list)
    wellbeing: list[WorkforceContextItem] = Field(default_factory=list)
    staffing_risks: list[WorkforceContextItem] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    privacy_notice: str = ""
    limitations: list[str] = Field(default_factory=list)
    routes: WorkforceContextRoutes = Field(default_factory=WorkforceContextRoutes)
    metadata: dict[str, Any] = Field(default_factory=dict)


class WorkforceContextHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    service: str = "workforce_context_service"
    shift_data_available: bool = False
    workforce_intelligence_available: bool = False
    storage_mode: str = "operational"
    metadata_only: bool = True
