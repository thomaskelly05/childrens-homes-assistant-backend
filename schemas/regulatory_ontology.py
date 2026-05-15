from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class RegulatoryOntologyNode(BaseModel):
    id: str
    title: str
    node_type: str
    plain_english_meaning: str
    required_evidence: list[str] = Field(default_factory=list)
    linked_record_types: list[str] = Field(default_factory=list)
    linked_document_types: list[str] = Field(default_factory=list)
    linked_actions: list[str] = Field(default_factory=list)
    linked_roles: list[str] = Field(default_factory=list)
    linked_orb_behaviour: list[str] = Field(default_factory=list)
    linked_daily_note_metadata: list[str] = Field(default_factory=list)
    linked_inspection_evidence: list[str] = Field(default_factory=list)
    review_frequency: str = "manager review when evidence changes"
    evidence_strength_rules: list[str] = Field(default_factory=list)
    gap_detection_rules: list[str] = Field(default_factory=list)
    manager_oversight_triggers: list[str] = Field(default_factory=list)
    source_refs: list[str] = Field(default_factory=list)
    related_node_ids: list[str] = Field(default_factory=list)


class RegulatoryOntologySummary(BaseModel):
    node_count: int
    quality_standard_ids: list[str] = Field(default_factory=list)
    regulation_ids: list[str] = Field(default_factory=list)
    sccif_area_ids: list[str] = Field(default_factory=list)
    source_documents: list[dict[str, Any]] = Field(default_factory=list)
    guardrails: list[str] = Field(default_factory=list)
