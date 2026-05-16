from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

OperationalLifecycleStatus = Literal[
    "open",
    "acknowledged",
    "in_review",
    "resolved",
    "reopened",
    "escalated",
    "archived",
]


class OperationalStateResolution(BaseModel):
    resolved_by: str | None = None
    resolved_at: str | None = None
    resolution_reason: str | None = None
    review_notes: str | None = None


class OperationalStateEscalation(BaseModel):
    escalated_by: str | None = None
    escalated_at: str | None = None
    escalation_reason: str | None = None
    escalation_level: str | None = None
    assigned_to: str | None = None
    assigned_role: str | None = None


class GovernanceSignOff(BaseModel):
    signoff_id: str | None = None
    state: str = "not_required"
    reviewer_id: str | None = None
    reviewer_name: str | None = None
    signed_off_by: str | None = None
    signed_off_at: str | None = None
    required_role: str | None = None
    notes: str | None = None


class EvidenceEdge(BaseModel):
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    relationship: str
    explanation: str = "Linked as supporting operational evidence."
    confidence: str = "recorded"
    created_at: str | None = None


class OperationalStateHistoryEvent(BaseModel):
    event_id: str | None = None
    status: OperationalLifecycleStatus
    transition: str
    actor_id: str | None = None
    actor_name: str | None = None
    occurred_at: str | None = None
    notes: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)
    chronology_ids: list[str] = Field(default_factory=list)
    governance_ids: list[str] = Field(default_factory=list)


class AuditTimelineEvent(BaseModel):
    event_id: str | None = None
    actor_id: str | None = None
    actor_name: str | None = None
    action: str
    entity_type: str
    entity_id: str
    timestamp: str | None = None
    change_summary: str | None = None
    linked_evidence: list[str] = Field(default_factory=list)
    linked_chronology: list[str] = Field(default_factory=list)
    operational_relevance: str = "operational"
    safeguarding_relevance: str = "not_assessed"
    governance_relevance: str = "not_assessed"
    metadata: dict[str, Any] = Field(default_factory=dict)


class InspectionEvidenceTrace(BaseModel):
    framework: str
    requirement: str
    evidence_status: str = "not_assessed"
    linked_records: list[str] = Field(default_factory=list)
    linked_chronology: list[str] = Field(default_factory=list)
    linked_safeguarding: list[str] = Field(default_factory=list)
    linked_documents: list[str] = Field(default_factory=list)
    linked_operational_states: list[str] = Field(default_factory=list)
    review_history: list[OperationalStateHistoryEvent] = Field(default_factory=list)
    signoff_history: list[GovernanceSignOff] = Field(default_factory=list)
    stale_evidence: bool = False
    missing_evidence: bool = False
    management_oversight_required: bool = False


class RealtimeAwarenessEvent(BaseModel):
    event_type: str
    home_id: str
    entity_type: str
    entity_id: str
    lifecycle_status: OperationalLifecycleStatus | None = None
    change_summary: str | None = None
    dedupe_key: str | None = None
    reconnect_hint: str = "refresh affected operational panels"


class AssistantOversightMarker(BaseModel):
    interaction_id: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)
    chronology_ids: list[str] = Field(default_factory=list)
    operational_state_ids: list[str] = Field(default_factory=list)
    governance_policy_ids: list[str] = Field(default_factory=list)
    uncertainty_note: str = "Assistant output remains draft support and requires professional review."
    degraded_behaviour: str | None = None


class DurabilityRecoveryMarker(BaseModel):
    workflow_id: str | None = None
    idempotency_key: str | None = None
    save_state: str = "unknown"
    retry_state: str = "not_required"
    recovery_hint: str = "Review the latest saved state before retrying."


class OperationalStateLifecycleSnapshot(BaseModel):
    entity_type: str
    entity_id: str
    current_state: OperationalLifecycleStatus
    transition: str | None = None
    assigned_to: str | None = None
    assigned_role: str | None = None
    resolution: OperationalStateResolution = Field(default_factory=OperationalStateResolution)
    escalation: OperationalStateEscalation = Field(default_factory=OperationalStateEscalation)
    signoff: GovernanceSignOff = Field(default_factory=GovernanceSignOff)
    history: list[OperationalStateHistoryEvent] = Field(default_factory=list)
    audit_timeline: list[AuditTimelineEvent] = Field(default_factory=list)
    evidence_edges: list[EvidenceEdge] = Field(default_factory=list)
    inspection_traces: list[InspectionEvidenceTrace] = Field(default_factory=list)
    assistant_oversight: AssistantOversightMarker | None = None
    durability: DurabilityRecoveryMarker | None = None
    chronology_ids: list[str] = Field(default_factory=list)
    governance_ids: list[str] = Field(default_factory=list)
    calm_summary: str = "Current state is visible for review."


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
