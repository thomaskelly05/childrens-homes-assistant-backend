"""Reviewable plan impact suggestions — never silent plan updates."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

PlanImpactStatus = Literal[
    "suggested",
    "accepted",
    "rejected",
    "superseded",
    "action_created",
]

PlanImpactType = Literal[
    "health_plan",
    "education_plan",
    "family_time_plan",
    "care_plan",
    "risk_assessment",
    "community_risk_assessment",
    "missing_from_care_plan",
    "behaviour_support_plan",
    "medication_plan",
    "safeguarding_plan",
    "life_story_plan",
    "other",
]


class PlanImpactSuggestion(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    child_id: int
    home_id: int | None = None
    source_type: str
    source_id: str | None = None
    archive_record_id: str | None = None
    suggested_plan_type: PlanImpactType
    title: str
    safe_summary: str = ""
    suggested_update: str = ""
    evidence_date: str | None = None
    risk_level: str | None = None
    review_required: bool = True
    manager_review_required: bool = False
    accepted_by_user_id: str | None = None
    accepted_at: str | None = None
    status: PlanImpactStatus = "suggested"
    route: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class PlanImpactFilter(BaseModel):
    model_config = ConfigDict(extra="ignore")

    child_id: int | None = None
    home_id: int | None = None
    status: PlanImpactStatus | None = None
    suggested_plan_type: PlanImpactType | None = None
    page: int = 1
    page_size: int = 50


class PlanImpactListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    suggestions: list[PlanImpactSuggestion] = Field(default_factory=list)
    total: int = 0


class PlanImpactActionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    decision: Literal["accept", "reject", "create_action"] = "accept"
    comments: str | None = None
