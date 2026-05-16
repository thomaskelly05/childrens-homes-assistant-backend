from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


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


OperationalSeverity = Literal["info", "low", "medium", "high", "urgent"]
OperationalPriority = Literal["low", "medium", "high", "urgent"]


class OperationalLink(BaseModel):
    """Small, reusable source link used by states, queues and evidence graph edges."""

    model_config = ConfigDict(extra="allow")

    link_type: str
    id: str
    label: str
    href: str | None = None
    source_type: str | None = None


class OperationalStateDTO(BaseModel):
    """Canonical transport contract for deterministic operational attention states."""

    model_config = ConfigDict(extra="allow")

    id: str
    state_type: str
    category: str
    title: str
    severity: OperationalSeverity = "medium"
    priority: OperationalPriority = "medium"
    priority_score: int = 50
    scope_type: str = "provider"
    linked_child_id: str | None = None
    linked_staff_id: str | None = None
    linked_home_id: str | None = None
    linked_document_id: str | None = None
    reason: str
    created_at: str
    updated_at: str
    next_action: str
    evidence_links: list[OperationalLink] = Field(default_factory=list)
    chronology_links: list[OperationalLink] = Field(default_factory=list)
    regulation_relevance: list[str] = Field(default_factory=list)
    review_required: bool = True
    resolved: bool = False
    status: str = "needs_review"
    source_type: str | None = None
    source_id: str | None = None
    refresh_events: list[str] = Field(default_factory=list)


class OperationalQueueDTO(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    queue_type: str
    title: str
    count: int = 0
    highest_priority: OperationalPriority = "medium"
    highest_priority_score: int = 50
    status: str = "needs_review"
    reason: str
    next_action: str
    operational_state_ids: list[str] = Field(default_factory=list)
    linked_child_ids: list[str] = Field(default_factory=list)
    linked_staff_ids: list[str] = Field(default_factory=list)
    linked_home_ids: list[str] = Field(default_factory=list)
    evidence_links: list[OperationalLink] = Field(default_factory=list)
    chronology_links: list[OperationalLink] = Field(default_factory=list)
    regulation_relevance: list[str] = Field(default_factory=list)
    updated_at: str


class EvidenceRelationshipDTO(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    relationship_type: str
    source_type: str
    source_id: str
    source_label: str
    target_type: str
    target_id: str
    target_label: str
    regulation_relevance: list[str] = Field(default_factory=list)
    chronology_event_ids: list[str] = Field(default_factory=list)
    operational_state_ids: list[str] = Field(default_factory=list)
    used_in_inspection_readiness: bool = False
    confidence: str = "deterministic"


class OperationalSearchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    query: str = ""
    state_type: str | None = None
    unresolved_only: bool = False
    safeguarding_relevant: bool = False
    evidence_gaps_only: bool = False
    regulation: str | None = None
    chronology_from: str | None = None
    chronology_to: str | None = None
    limit: int = 50


class OperationalSearchResultDTO(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    result_type: str
    title: str
    summary: str
    href: str | None = None
    priority: OperationalPriority = "medium"
    source_type: str | None = None
    source_id: str | None = None
    linked_child_id: str | None = None
    linked_staff_id: str | None = None
    linked_home_id: str | None = None
    evidence_links: list[OperationalLink] = Field(default_factory=list)
    chronology_links: list[OperationalLink] = Field(default_factory=list)
    regulation_relevance: list[str] = Field(default_factory=list)


class AssistantContextBriefDTO(BaseModel):
    model_config = ConfigDict(extra="allow")

    scope: dict[str, Any] = Field(default_factory=dict)
    operational_state_ids: list[str] = Field(default_factory=list)
    highest_priority_states: list[OperationalStateDTO] = Field(default_factory=list)
    queue_summary: list[OperationalQueueDTO] = Field(default_factory=list)
    evidence_relationship_count: int = 0
    chronology_link_count: int = 0
    guardrails: list[str] = Field(default_factory=list)


class OperationalStateSnapshotDTO(BaseModel):
    model_config = ConfigDict(extra="allow")

    generated_at: str
    scope: dict[str, Any] = Field(default_factory=dict)
    states: list[OperationalStateDTO] = Field(default_factory=list)
    queues: list[OperationalQueueDTO] = Field(default_factory=list)
    evidence_relationships: list[EvidenceRelationshipDTO] = Field(default_factory=list)
    search_results: list[OperationalSearchResultDTO] = Field(default_factory=list)
    assistant_context: AssistantContextBriefDTO | None = None
    summary: dict[str, Any] = Field(default_factory=dict)
    refresh: dict[str, Any] = Field(default_factory=dict)
