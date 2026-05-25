"""Lightweight OS home/child scope models — no dashboard aggregation."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

OsScopeType = Literal["none", "home", "child"]


class OsScopeHomeOption(BaseModel):
    id: int
    name: str
    status: str | None = None


class OsScopeChildOption(BaseModel):
    id: int
    name: str
    home_id: int | None = None
    placement_status: str | None = None


class OsScopeRoutes(BaseModel):
    select_scope: str = "/select-scope"
    home_workspace: str | None = None
    child_workspace: str | None = None
    settings: str = "/settings"
    logout: str = "/login"


class OsScopeState(BaseModel):
    scope_type: OsScopeType = "none"
    selected_home_id: int | None = None
    selected_home_name: str | None = None
    selected_child_id: int | None = None
    selected_child_name: str | None = None
    recent_homes: list[OsScopeHomeOption] = Field(default_factory=list)
    recent_children: list[OsScopeChildOption] = Field(default_factory=list)
    available_homes: list[OsScopeHomeOption] = Field(default_factory=list)
    available_children_for_home: list[OsScopeChildOption] = Field(default_factory=list)
    routes: OsScopeRoutes = Field(default_factory=OsScopeRoutes)
    warnings: list[str] = Field(default_factory=list)
    degraded: bool = False
    cache_status: str = "miss"


class OsScopeSelectRequest(BaseModel):
    scope_type: OsScopeType
    home_id: int | None = None
    child_id: int | None = None
    home_name: str | None = None
    child_name: str | None = None


class OsScopeMenuSummary(BaseModel):
    scope_type: OsScopeType = "none"
    home_id: int | None = None
    child_id: int | None = None
    recording_alert_count: int = 0
    action_count: int = 0
    notification_count: int = 0
    handover_review_count: int = 0
    warnings: list[str] = Field(default_factory=list)
    degraded: bool = False
    cache_status: str = "miss"


def scope_state_to_dict(state: OsScopeState) -> dict[str, Any]:
    return state.model_dump()
