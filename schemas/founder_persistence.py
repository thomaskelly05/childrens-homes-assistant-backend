"""Pydantic schemas for founder OS persistence routes."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class FounderRecordCreate(BaseModel):
    record: dict[str, Any]
    source: str = "founder-ui"


class FounderRecordUpdate(BaseModel):
    patch: dict[str, Any] = Field(default_factory=dict)
    status: str | None = None


class FounderAuditCreate(BaseModel):
    event_type: str
    entity_type: str
    entity_id: str
    summary: str
    status: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    linked_entity_id: str | None = None
    linked_entity_type: str | None = None


class FounderApprovalDecision(BaseModel):
    status: str
    founder_note: str | None = None
