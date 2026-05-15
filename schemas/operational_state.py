from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class OperationalStateDefinition(BaseModel):
    state_id: str
    title: str
    required_records: list[str] = Field(default_factory=list)
    suggested_documents: list[str] = Field(default_factory=list)
    risk_assessments_to_review: list[str] = Field(default_factory=list)
    plans_to_check: list[str] = Field(default_factory=list)
    chronology_links: list[str] = Field(default_factory=list)
    actions_to_consider: list[str] = Field(default_factory=list)
    manager_oversight_needs: list[str] = Field(default_factory=list)
    orb_tone: str = "calm, concise and practical"
    orb_prompts: list[str] = Field(default_factory=list)
    safe_language: list[str] = Field(default_factory=list)
    escalation_reminders: list[str] = Field(default_factory=list)
    regulatory_relevance: list[str] = Field(default_factory=list)


class OperationalStateAssessment(BaseModel):
    active_state: OperationalStateDefinition
    matched_signals: list[str] = Field(default_factory=list)
    required_records_missing: list[str] = Field(default_factory=list)
    suggested_next_actions: list[str] = Field(default_factory=list)
    manager_review_required: bool = False
    draft_only: bool = True
    automation_guardrails: list[str] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
