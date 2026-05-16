from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

AUDIT_CONTRACT_SCHEMA_VERSION = "2026-05-16.audit.v1"
AuditContractSchemaVersion = Literal["2026-05-16.audit.v1"]


def _non_blank(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("must not be blank")
    return cleaned


def _clean_ids(values: list[str]) -> list[str]:
    return list(dict.fromkeys(str(value).strip() for value in values if str(value).strip()))


class AuditTimelineEvent(BaseModel):
    schema_version: AuditContractSchemaVersion = AUDIT_CONTRACT_SCHEMA_VERSION
    event_id: str | None = None
    actor_id: str | None = None
    actor_role: str | None = None
    provider_id: int | None = None
    home_id: int | None = None
    entity_type: str
    entity_id: str
    action: str
    timestamp: str | None = None
    chronology_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    lifecycle_ids: list[str] = Field(default_factory=list)
    governance_ids: list[str] = Field(default_factory=list)
    assistant_ids: list[str] = Field(default_factory=list)
    correlation_id: str | None = None
    replay_metadata: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)

    _required_text = field_validator("entity_type", "entity_id", "action")(_non_blank)
    _clean_lists = field_validator(
        "chronology_ids",
        "evidence_ids",
        "lifecycle_ids",
        "governance_ids",
        "assistant_ids",
    )(_clean_ids)
