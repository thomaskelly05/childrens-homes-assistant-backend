from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

INSPECTION_CONTRACT_SCHEMA_VERSION = "2026-05-16.inspection.v1"
InspectionContractSchemaVersion = Literal["2026-05-16.inspection.v1"]


def _non_blank(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("must not be blank")
    return cleaned


def _clean_ids(values: list[str]) -> list[str]:
    return list(dict.fromkeys(str(value).strip() for value in values if str(value).strip()))


class InspectionLinkedDTO(BaseModel):
    schema_version: InspectionContractSchemaVersion = INSPECTION_CONTRACT_SCHEMA_VERSION
    chronology_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    lifecycle_ids: list[str] = Field(default_factory=list)
    governance_ids: list[str] = Field(default_factory=list)
    audit_ids: list[str] = Field(default_factory=list)
    signoff_history: list[dict[str, str]] = Field(default_factory=list)
    stale_evidence: bool = False
    review_metadata: dict[str, str] = Field(default_factory=dict)

    _clean_lists = field_validator(
        "chronology_ids",
        "evidence_ids",
        "lifecycle_ids",
        "governance_ids",
        "audit_ids",
    )(_clean_ids)


class InspectionArea(InspectionLinkedDTO):
    area_id: str
    title: str
    status: str = "not_assessed"

    _required_text = field_validator("area_id", "title")(_non_blank)


class EvidenceGap(InspectionLinkedDTO):
    gap_id: str
    title: str
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    management_action_required: bool = True

    _required_text = field_validator("gap_id", "title")(_non_blank)


class EvidenceStrength(InspectionLinkedDTO):
    strength_id: str
    title: str
    confidence: Literal["emerging", "reasonable", "strong"] = "reasonable"

    _required_text = field_validator("strength_id", "title")(_non_blank)


class Reg44Finding(InspectionLinkedDTO):
    finding_id: str
    regulation: str = "Reg 44"
    summary: str

    _required_text = field_validator("finding_id", "summary")(_non_blank)


class Reg45Finding(InspectionLinkedDTO):
    finding_id: str
    regulation: str = "Reg 45"
    summary: str

    _required_text = field_validator("finding_id", "summary")(_non_blank)


class AnnexAItem(InspectionLinkedDTO):
    item_id: str
    requirement: str
    status: str = "not_ready"

    _required_text = field_validator("item_id", "requirement")(_non_blank)


class SCCIFTrace(InspectionLinkedDTO):
    trace_id: str
    judgement_area: str
    summary: str

    _required_text = field_validator("trace_id", "judgement_area", "summary")(_non_blank)


class InspectionManagementAction(InspectionLinkedDTO):
    action_id: str
    title: str
    owner_role: str | None = None
    due_at: str | None = None
    status: str = "open"

    _required_text = field_validator("action_id", "title")(_non_blank)


class InspectionReview(InspectionLinkedDTO):
    review_id: str
    area: InspectionArea
    evidence_gaps: list[EvidenceGap] = Field(default_factory=list)
    evidence_strengths: list[EvidenceStrength] = Field(default_factory=list)
    reg44_findings: list[Reg44Finding] = Field(default_factory=list)
    reg45_findings: list[Reg45Finding] = Field(default_factory=list)
    annex_a_items: list[AnnexAItem] = Field(default_factory=list)
    sccif_traces: list[SCCIFTrace] = Field(default_factory=list)
    management_actions: list[InspectionManagementAction] = Field(default_factory=list)

    _required_text = field_validator("review_id")(_non_blank)
