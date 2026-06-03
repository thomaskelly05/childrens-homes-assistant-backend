"""Schemas for ORB learning ledger entries (anonymised)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class OrbLearningLedgerEntry(BaseModel):
    user_role: str | None = None
    prompt_summary: str = Field(max_length=500)
    intent: str | None = None
    active_brains: list[str] = Field(default_factory=list)
    risk_level: str | None = None
    source_basis: list[str] = Field(default_factory=list)
    answer_quality_score: float | None = None
    missing_markers: list[str] = Field(default_factory=list)
    follow_up_classification: str | None = None
    user_feedback: str | None = None
    copied: bool = False
    exported: bool = False
    record_created: bool = False
    answer_regenerated: bool = False
    manager_amended: bool = False
    learning_tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
