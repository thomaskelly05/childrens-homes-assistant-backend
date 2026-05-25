"""Staff Profile OS — safe metadata-only adult working-life dashboard schemas."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

StaffProfileOsSensitivity = Literal[
    "public_operational",
    "manager_only",
    "hr_sensitive",
    "confidential",
]

StaffProfileOsSectionType = Literal[
    "overview",
    "role_home",
    "shift_context",
    "actions",
    "recording",
    "handover",
    "training",
    "supervision",
    "probation",
    "wellbeing",
    "recruitment",
    "workforce_journey",
    "manager_prompts",
]


class StaffProfileOsItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    safe_summary: str
    section_type: StaffProfileOsSectionType
    sensitivity: StaffProfileOsSensitivity = "public_operational"
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    route: str
    action_label: str | None = None
    related_id: str | None = None
    related_type: str | None = None
    due_at: str | None = None
    status: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class StaffProfileOsSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    section_type: StaffProfileOsSectionType
    summary: str
    items: list[StaffProfileOsItem] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    route: str
    action_label: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class StaffProfileOsOverview(BaseModel):
    model_config = ConfigDict(extra="ignore")

    staff_id: int
    staff_name: str
    role: str | None = None
    home_id: int | None = None
    home_name: str | None = None
    employment_status: str | None = None
    shift_label: str | None = None
    shift_role: str | None = None
    profile_route: str
    avatar_url: str | None = None
    badges: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class StaffProfileOsRoutes(BaseModel):
    model_config = ConfigDict(extra="ignore")

    profile: str = "/staff"
    training_matrix: str = "/staff/training-matrix"
    supervision: str = "/staff/supervision"
    probation: str = "/staff/probation"
    induction: str = "/staff/induction"
    wellbeing: str = "/staff/wellbeing"
    recruitment: str = "/staff/safer-recruitment"
    shifts: str = "/shifts/current"
    rota: str = "/rostering"
    handover: str = "/handover"
    actions: str = "/actions"
    chronology: str = "/staff"
    workforce_journey: str = "/staff"
    orb: str = "/assistant/orb?mode=manager_daily_brief"


class StaffProfileOsDashboard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated_at: str
    staff_id: int
    overview: StaffProfileOsOverview
    sections: list[StaffProfileOsSection] = Field(default_factory=list)
    action_count: int = 0
    training_due_count: int = 0
    supervision_due_count: int = 0
    probation_review_count: int = 0
    wellbeing_flags_count: int = 0
    handover_items_count: int = 0
    recommendations: list[str] = Field(default_factory=list)
    privacy_notice: str = ""
    limitations: list[str] = Field(default_factory=list)
    orb_prompts: list[dict[str, str]] = Field(default_factory=list)
    routes: StaffProfileOsRoutes = Field(default_factory=StaffProfileOsRoutes)
    metadata: dict[str, Any] = Field(default_factory=dict)


class StaffProfileOsHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    service: str = "staff_profile_os_service"
    workforce_journey_available: bool = False
    shift_data_available: bool = False
    storage_mode: str = "operational"
    metadata_only: bool = True


class StaffProfileOsFilters(BaseModel):
    model_config = ConfigDict(extra="ignore")

    staff_id: int | None = None
    home_id: int | None = None
    include_manager_only: bool = False
