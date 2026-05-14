from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class DataClassification(StrEnum):
    PUBLIC_SYSTEM = "public_system"
    INTERNAL_OPERATIONAL = "internal_operational"
    CONFIDENTIAL_STAFF = "confidential_staff"
    CONFIDENTIAL_CHILD = "confidential_child"
    SAFEGUARDING_SENSITIVE = "safeguarding_sensitive"
    HEALTH_SENSITIVE = "health_sensitive"
    EDUCATION_SENSITIVE = "education_sensitive"
    LEGAL_REGULATORY = "legal_regulatory"
    HIGHLY_SENSITIVE = "highly_sensitive"
    AI_RESTRICTED = "ai_restricted"
    EXPORT_RESTRICTED = "export_restricted"


class RetentionState(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    LEGAL_HOLD = "legal_hold"
    DELETION_REQUESTED = "deletion_requested"


class DataProtectionMetadata(BaseModel):
    classification: DataClassification
    record_type: str
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    ai_restricted: bool = True
    export_restricted: bool = False
    retention_state: RetentionState = RetentionState.ACTIVE
    legal_hold: bool = False
    reason: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AIPrivacyDecision(BaseModel):
    allowed: bool
    reason: str
    mode: str
    redaction_mode: str
    no_training_required: bool = True
    store_prompts: bool = False
    store_transcripts: bool = False
    audit_prompts: bool = True
    classification: DataClassification | None = None


class DocumentSecurityResult(BaseModel):
    allowed: bool
    reason: str
    classification: DataClassification
    safe_filename: str | None = None
    max_size_bytes: int | None = None
