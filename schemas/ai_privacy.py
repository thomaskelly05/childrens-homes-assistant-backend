"""AI privacy guardrails — surfaces, data classes, permission decisions, audit metadata."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

AiPrivacySurface = Literal[
    "standalone_orb",
    "operational_orb",
    "record_hub",
    "care_hub",
    "intelligence_spine",
    "governance_dashboard",
    "knowledge_library",
    "operational_outputs",
    "saved_outputs",
]

AiDataClass = Literal[
    "no_record_data",
    "reference_guidance",
    "user_provided_document",
    "child_record_summary",
    "child_record_raw",
    "safeguarding_summary",
    "safeguarding_raw",
    "health_medication",
    "body_map",
    "incident_record",
    "missing_episode",
    "restraint_record",
    "staff_record",
    "staff_wellbeing",
    "operational_metadata",
    "AI_governance_metadata",
]

AiSensitivityLevel = Literal[
    "public",
    "internal",
    "confidential",
    "highly_sensitive",
    "safeguarding_sensitive",
    "child_special_category",
]

AiPrivacyAction = Literal[
    "ask_general",
    "use_reference_guidance",
    "summarise_record",
    "rewrite_record",
    "analyse_record_quality",
    "analyse_safeguarding_theme",
    "create_action",
    "create_operational_output",
    "export_output",
    "view_governance",
    "approve_source",
    "use_child_context",
    "use_staff_context",
    "send_to_model",
]

AiPermissionDecision = Literal[
    "allow",
    "allow_minimised",
    "allow_redacted",
    "deny",
    "require_manager_review",
    "require_escalation",
    "unavailable",
]

AiRedactionMode = Literal["light", "standard", "strict", "safeguarding_strict", "off"]


class AiPermissionCheckRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    surface: AiPrivacySurface
    action: AiPrivacyAction
    data_classes: list[AiDataClass] = Field(default_factory=list)
    sensitivity: AiSensitivityLevel = "internal"
    home_id: int | None = None
    child_id: int | None = None
    staff_id: int | None = None
    output_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiPermissionCheckResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    decision: AiPermissionDecision
    allowed: bool
    model_send_allowed: bool = False
    export_allowed: bool = False
    manager_review_required: bool = False
    safeguarding_review_required: bool = False
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiRedactionFinding(BaseModel):
    model_config = ConfigDict(extra="ignore")

    label: str
    pattern_type: str
    count: int = 1
    sample_token: str | None = None


class AiRedactionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str = Field(..., min_length=0, max_length=50000)
    data_classes: list[AiDataClass] = Field(default_factory=list)
    mode: AiRedactionMode = "standard"
    known_names: list[str] = Field(default_factory=list)


class AiRedactionResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str
    mode: AiRedactionMode = "standard"
    findings: list[AiRedactionFinding] = Field(default_factory=list)
    replacements: dict[str, str] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    redaction_applied: bool = False


class AiContextMinimisationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    context: dict[str, Any] = Field(default_factory=dict)
    action: AiPrivacyAction = "send_to_model"
    data_classes: list[AiDataClass] = Field(default_factory=list)
    allowed_fields: list[str] | None = None


class AiContextMinimisationResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    context: dict[str, Any] = Field(default_factory=dict)
    minimisation_applied: bool = False
    blocked_fields: list[str] = Field(default_factory=list)
    summary: str = ""
    warnings: list[str] = Field(default_factory=list)


class AiPrivacyGuardRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    surface: AiPrivacySurface
    action: AiPrivacyAction = "send_to_model"
    context: dict[str, Any] = Field(default_factory=dict)
    message: str | None = None
    data_classes: list[AiDataClass] = Field(default_factory=list)
    sensitivity: AiSensitivityLevel = "internal"
    home_id: int | None = None
    child_id: int | None = None
    staff_id: int | None = None
    output_id: str | None = None
    redaction_mode: AiRedactionMode = "standard"
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiRetentionPolicy(BaseModel):
    model_config = ConfigDict(extra="ignore")

    surface: AiPrivacySurface | str
    data_classes: list[AiDataClass] = Field(default_factory=list)
    retention_days: int | None = None
    notice: str = ""
    ephemeral: bool = False
    user_controlled: bool = False


class AiExportDecision(BaseModel):
    model_config = ConfigDict(extra="ignore")

    allowed: bool
    decision: AiPermissionDecision
    export_allowed: bool = False
    privacy_notice: str = ""
    warnings: list[str] = Field(default_factory=list)
    audit_event_id: str | None = None


class AiPrivacyGuardResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    decision: AiPermissionDecision
    allowed: bool
    data_classes: list[AiDataClass] = Field(default_factory=list)
    sensitivity: AiSensitivityLevel = "internal"
    redaction_applied: bool = False
    minimisation_applied: bool = False
    manager_review_required: bool = False
    safeguarding_review_required: bool = False
    export_allowed: bool = False
    model_send_allowed: bool = False
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    safe_context: dict[str, Any] = Field(default_factory=dict)
    blocked_fields: list[str] = Field(default_factory=list)
    audit_event_id: str | None = None
    retention_policy: AiRetentionPolicy | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    privacy_notice: str = ""


class AiPrivacyAuditEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    surface: AiPrivacySurface | str
    action: AiPrivacyAction | str
    decision: AiPermissionDecision | str
    user_id: str | None = None
    user_role: str | None = None
    home_id: int | None = None
    child_id: int | None = None
    staff_id: int | None = None
    output_id: str | None = None
    data_classes: list[str] = Field(default_factory=list)
    sensitivity: str | None = None
    redaction_applied: bool = False
    minimisation_applied: bool = False
    manager_review_required: bool = False
    safeguarding_review_required: bool = False
    export_allowed: bool | None = None
    model_send_allowed: bool | None = None
    blocked_fields: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None


class AiPrivacyDashboardSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    total_events: int = 0
    denied_attempts: int = 0
    redaction_applied_count: int = 0
    minimisation_applied_count: int = 0
    child_scoped_attempts: int = 0
    raw_record_blocked: int = 0
    standalone_os_context_blocked: int = 0
    safeguarding_review_required: int = 0
    manager_review_required: int = 0
    exports_allowed: int = 0
    exports_blocked: int = 0
    model_send_blocked: int = 0
    events_by_surface: dict[str, int] = Field(default_factory=dict)
    events_by_decision: dict[str, int] = Field(default_factory=dict)


class AiPrivacyAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    level: Literal["info", "low", "medium", "high", "critical"] = "info"
    title: str
    message: str
    surface: str | None = None
    created_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiPrivacyHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: Literal["ready", "degraded", "unavailable"] = "ready"
    storage_mode: str = "memory"
    events_table_available: bool = False
    database_available: bool = True
    warnings: list[str] = Field(default_factory=list)
    privacy_notice: str = (
        "Privacy governance uses metadata and redacted previews only. "
        "Raw care record bodies are not stored or displayed."
    )


class AiPrivacyFilter(BaseModel):
    model_config = ConfigDict(extra="ignore")

    period: Literal["24h", "7d", "30d", "90d", "all"] = "7d"
    surface: AiPrivacySurface | None = None
    home_id: int | None = None
    decision: AiPermissionDecision | None = None
    limit: int = Field(default=50, ge=1, le=500)


class AiPrivacyDashboardResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: AiPrivacyDashboardSummary
    health: AiPrivacyHealth
    alerts: list[AiPrivacyAlert] = Field(default_factory=list)
    recent_events: list[AiPrivacyAuditEvent] = Field(default_factory=list)
    degraded: bool = False
    warning: str | None = None


class OrbOperationalPrivacyGuardSummary(BaseModel):
    """Summary attached to operational ORB responses — no raw record text."""

    model_config = ConfigDict(extra="ignore")

    decision: AiPermissionDecision
    allowed: bool
    redaction_applied: bool = False
    minimisation_applied: bool = False
    manager_review_required: bool = False
    safeguarding_review_required: bool = False
    model_send_allowed: bool = False
    blocked_fields: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    privacy_notice: str = ""
    audit_event_id: str | None = None
