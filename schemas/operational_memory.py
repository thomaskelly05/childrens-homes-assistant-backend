from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from schemas.operational_state import OPERATIONAL_STATE_SCHEMA_VERSION

OperationalMemorySchemaVersion = Literal["2026-05-16.v1"]


def _clean_ids(values: list[str]) -> list[str]:
    return list(dict.fromkeys(str(value).strip() for value in values if str(value).strip()))


class VersionedOperationalMemoryDTO(BaseModel):
    schema_version: OperationalMemorySchemaVersion = OPERATIONAL_STATE_SCHEMA_VERSION


class ReplayIntegrity(VersionedOperationalMemoryDTO):
    ordering_valid: bool = True
    duplicate_event_keys: list[str] = Field(default_factory=list)
    replay_gap_after_ids: list[int] = Field(default_factory=list)
    stale_event_ids: list[str] = Field(default_factory=list)

    _clean_lists = field_validator("duplicate_event_keys", "stale_event_ids")(_clean_ids)


class OperationalMemoryReplayEvent(VersionedOperationalMemoryDTO):
    id: int
    replay_key: str
    source_table: str
    provider_id: int | None = None
    home_id: int | None = None
    entity_type: str
    entity_id: str
    actor_id: int | None = None
    correlation_id: str
    created_at: str
    event_type: str
    transition_type: str | None = None
    previous_state: dict[str, Any] = Field(default_factory=dict)
    next_state: dict[str, Any] = Field(default_factory=dict)
    evidence_references: list[str] = Field(default_factory=list)
    chronology_references: list[str] = Field(default_factory=list)
    governance_references: list[str] = Field(default_factory=list)
    replay_references: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)

    _clean_lists = field_validator(
        "evidence_references",
        "chronology_references",
        "governance_references",
    )(_clean_ids)


class OperationalMemoryReplayResult(VersionedOperationalMemoryDTO):
    ok: bool = True
    scope: dict[str, Any] = Field(default_factory=dict)
    events: list[OperationalMemoryReplayEvent] = Field(default_factory=list)
    next_cursor: int = 0
    integrity: ReplayIntegrity = Field(default_factory=ReplayIntegrity)
    export: dict[str, Any] | None = None


class ChronologyProjection(VersionedOperationalMemoryDTO):
    projection_id: str
    projection_type: str
    entity_type: str
    entity_id: str
    occurred_at: str
    title: str
    summary: str
    linked_evidence: list[str] = Field(default_factory=list)
    linked_operational_states: list[str] = Field(default_factory=list)
    linked_lifecycle_events: list[str] = Field(default_factory=list)
    linked_governance_reviews: list[str] = Field(default_factory=list)
    linked_inspections: list[str] = Field(default_factory=list)
    linked_signoffs: list[str] = Field(default_factory=list)
    source_event_ids: list[str] = Field(default_factory=list)
    replay_cursor: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)

    _clean_lists = field_validator(
        "linked_evidence",
        "linked_operational_states",
        "linked_lifecycle_events",
        "linked_governance_reviews",
        "linked_inspections",
        "linked_signoffs",
        "source_event_ids",
    )(_clean_ids)


class EvidenceTraversalNode(VersionedOperationalMemoryDTO):
    node_id: str
    node_type: str
    label: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvidenceTraversalEdge(VersionedOperationalMemoryDTO):
    source_id: str
    target_id: str
    relationship: str
    why_linked: str
    source_event_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvidenceTraversal(VersionedOperationalMemoryDTO):
    root_entity_type: str
    root_entity_id: str
    nodes: list[EvidenceTraversalNode] = Field(default_factory=list)
    edges: list[EvidenceTraversalEdge] = Field(default_factory=list)
    chronology_linked_evidence: list[str] = Field(default_factory=list)
    inspection_linked_evidence: list[str] = Field(default_factory=list)
    lifecycle_linked_evidence: list[str] = Field(default_factory=list)
    governance_linked_evidence: list[str] = Field(default_factory=list)

    _clean_lists = field_validator(
        "chronology_linked_evidence",
        "inspection_linked_evidence",
        "lifecycle_linked_evidence",
        "governance_linked_evidence",
    )(_clean_ids)


class ProviderOperationalQueueItem(VersionedOperationalMemoryDTO):
    queue_id: str
    category: str
    provider_id: int | None = None
    home_id: int | None = None
    entity_type: str
    entity_id: str
    status: str
    priority: str = "medium"
    title: str
    reason: str
    chronology_links: list[str] = Field(default_factory=list)
    lifecycle_links: list[str] = Field(default_factory=list)
    evidence_links: list[str] = Field(default_factory=list)
    governance_links: list[str] = Field(default_factory=list)
    inspection_links: list[str] = Field(default_factory=list)
    replay_cursor: int = 0

    _clean_lists = field_validator(
        "chronology_links",
        "lifecycle_links",
        "evidence_links",
        "governance_links",
        "inspection_links",
    )(_clean_ids)


class EventReconciliationFinding(VersionedOperationalMemoryDTO):
    finding_id: str
    severity: Literal["info", "warning", "critical"] = "warning"
    finding_type: str
    entity_type: str | None = None
    entity_id: str | None = None
    correlation_id: str | None = None
    description: str
    repair_hint: str
    source_event_ids: list[str] = Field(default_factory=list)

    _clean_lists = field_validator("source_event_ids")(_clean_ids)


class EventReconciliationReport(VersionedOperationalMemoryDTO):
    ok: bool = True
    scope: dict[str, Any] = Field(default_factory=dict)
    findings: list[EventReconciliationFinding] = Field(default_factory=list)
    repair_jobs: list[dict[str, Any]] = Field(default_factory=list)
