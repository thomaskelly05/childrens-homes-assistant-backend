from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from schemas.operational_state import OPERATIONAL_STATE_SCHEMA_VERSION

ISNSignalType = Literal[
    "missing_episode",
    "exploitation_concern",
    "county_lines_indicator",
    "location_sighting",
    "vehicle_sighting",
    "digital_risk",
    "peer_association",
    "unknown_adult_contact",
    "gifting_or_debt",
    "transport_route",
    "professional_intelligence",
]

ISNRiskLevel = Literal["low", "medium", "high", "critical"]
ISNAlertStatus = Literal["new", "reviewing", "actioned", "closed", "false_positive"]


def _clean_strings(values: list[str]) -> list[str]:
    return list(dict.fromkeys(str(value).strip() for value in values if str(value).strip()))


class ISNVersionedDTO(BaseModel):
    schema_version: str = OPERATIONAL_STATE_SCHEMA_VERSION


class ISNSignalCreateRequest(BaseModel):
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    signal_type: ISNSignalType
    occurred_at: str | None = None
    title: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    risk_level: ISNRiskLevel = "medium"
    location_text: str | None = None
    postcode_prefix: str | None = None
    transport_route: str | None = None
    vehicle_description: str | None = None
    alias_or_nickname: str | None = None
    digital_handle: str | None = None
    source_record_type: str | None = None
    source_record_id: str | None = None
    indicator_tags: list[str] = Field(default_factory=list)
    evidence_refs: list[str] = Field(default_factory=list)
    intelligence_notes: str | None = None
    anonymised_context: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)

    _clean_lists = field_validator("indicator_tags", "evidence_refs")(_clean_strings)


class ISNSignalRecord(ISNVersionedDTO):
    id: str
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    signal_type: str
    occurred_at: str | None = None
    title: str
    summary: str
    risk_level: str
    location_text: str | None = None
    postcode_prefix: str | None = None
    transport_route: str | None = None
    vehicle_description: str | None = None
    alias_or_nickname: str | None = None
    digital_handle: str | None = None
    source_record_type: str | None = None
    source_record_id: str | None = None
    indicator_tags: list[str] = Field(default_factory=list)
    evidence_refs: list[str] = Field(default_factory=list)
    intelligence_notes: str | None = None
    anonymised_context: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_by: int | None = None
    created_at: str | None = None

    _clean_lists = field_validator("indicator_tags", "evidence_refs")(_clean_strings)


class ISNAlertRecord(ISNVersionedDTO):
    id: str
    alert_type: str
    title: str
    summary: str
    risk_level: str
    status: ISNAlertStatus = "new"
    linked_signal_ids: list[str] = Field(default_factory=list)
    hotspot_key: str | None = None
    pattern: dict[str, Any] = Field(default_factory=dict)
    recommended_action: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    _clean_lists = field_validator("linked_signal_ids")(_clean_strings)


class ISNListResponse(ISNVersionedDTO):
    ok: bool = True
    items: list[ISNSignalRecord] = Field(default_factory=list)
    total: int = 0


class ISNHotspotResponse(ISNVersionedDTO):
    ok: bool = True
    hotspots: list[dict[str, Any]] = Field(default_factory=list)


class ISNAlertListResponse(ISNVersionedDTO):
    ok: bool = True
    alerts: list[ISNAlertRecord] = Field(default_factory=list)
    total: int = 0
