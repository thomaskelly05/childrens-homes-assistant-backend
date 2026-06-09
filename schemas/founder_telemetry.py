"""Pydantic schemas for founder OS telemetry routes."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class FounderTelemetryEventCreate(BaseModel):
    event_type: str = Field(alias="eventType")
    category: str
    source: str
    route: str | None = None
    timestamp: str | None = None
    user_role: str | None = Field(default=None, alias="userRole")
    session_id: str | None = Field(default=None, alias="sessionId")
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}
