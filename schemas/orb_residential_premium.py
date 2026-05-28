from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class OrbOnboardingPreferencesRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    role_label: str | None = Field(default=None, max_length=120)
    work_environment: str | None = Field(default=None, max_length=160)
    preferred_support_style: str | None = Field(default=None, max_length=120)
    onboarding_completed: bool = False
    preferences: dict[str, Any] = Field(default_factory=dict)


class OrbSavedProjectRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=2000)
    project_type: str = Field(default="general", max_length=80)
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbSavedOutputRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    content: str = Field(..., min_length=1, max_length=200000)
    project_id: int | None = None
    workflow: str = Field(default="ask_orb", max_length=80)
    output_type: str = Field(default="answer", max_length=80)
    title: str | None = Field(default=None, max_length=240)
    tags: list[str] = Field(default_factory=list, max_length=20)
    metadata: dict[str, Any] = Field(default_factory=dict)
