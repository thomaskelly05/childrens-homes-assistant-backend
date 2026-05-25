"""Notification preferences and escalation rule schemas — metadata-only, no raw bodies."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

NotificationPreferenceScope = Literal["user", "home", "provider", "role_default"]

NotificationPreferenceSource = Literal[
    "recording_alert",
    "isn",
    "manager_daily_brief",
    "recording_review",
    "intelligence_action",
    "governance",
    "system",
]

NotificationPreferenceCategory = Literal[
    "recording",
    "safeguarding_network",
    "daily_brief",
    "review",
    "action",
    "governance",
    "handover",
    "workforce",
    "system",
]

NotificationDeliveryChannel = Literal["in_app", "email_placeholder", "push_placeholder"]

EscalationRuleSeverity = Literal["low", "medium", "high", "urgent"]

EscalationRuleStatus = Literal["active", "disabled", "draft"]

SEVERITY_ORDER = {"low": 0, "medium": 1, "high": 2, "urgent": 3}


class NotificationPreferenceRule(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    scope: NotificationPreferenceScope = "user"
    scope_id: str | None = None
    role: str | None = None
    source: NotificationPreferenceSource | str
    category: NotificationPreferenceCategory | str
    enabled: bool = True
    min_severity: EscalationRuleSeverity = "low"
    in_app_enabled: bool = True
    email_enabled: bool = False
    push_enabled: bool = False
    urgent_override: bool = True
    quiet_hours_enabled: bool = False
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class NotificationPreferenceSet(BaseModel):
    model_config = ConfigDict(extra="ignore")

    scope: NotificationPreferenceScope = "user"
    scope_id: str | None = None
    role: str | None = None
    rules: list[NotificationPreferenceRule] = Field(default_factory=list)
    urgent_safeguarding_always_on: bool = True
    limitations: list[str] = Field(default_factory=list)
    updated_at: str | None = None


class NotificationPreferenceUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    rules: list[NotificationPreferenceRule] = Field(default_factory=list)
    urgent_safeguarding_always_on: bool = True
    scope: NotificationPreferenceScope = "user"
    scope_id: str | None = None


class NotificationPreferenceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    preferences: NotificationPreferenceSet
    role_defaults: list[NotificationPreferenceRule] = Field(default_factory=list)
    effective_rules: list[NotificationPreferenceRule] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    push_email_status: str = "not_configured_yet"


class NotificationPreferenceHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    service: str = "os_notification_preference_service"
    persistence_available: bool = False
    storage_mode: str = "memory"
    push_email_configured: bool = False


class NotificationEscalationRule(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    source: NotificationPreferenceSource | str
    category: NotificationPreferenceCategory | str
    min_severity: EscalationRuleSeverity = "high"
    status: EscalationRuleStatus = "active"
    trigger_after_minutes: int = 240
    route_to_role: str | None = None
    route_to_user_id: str | None = None
    route_to_user_name: str | None = None
    home_id: int | None = None
    applies_to_safeguarding: bool = False
    applies_to_isn: bool = False
    applies_to_recording: bool = False
    urgent_override: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)


class NotificationEscalationCandidate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    notification_key: str
    source: str
    category: str
    severity: EscalationRuleSeverity | str
    title: str
    safe_summary: str
    route: str
    age_minutes: int
    current_status: str
    escalation_rule_id: str
    route_to_role: str | None = None
    route_to_user_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class NotificationEscalationCheckRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    dry_run: bool = True
    home_id: int | None = None
    force: bool = False
    include_resolved: bool = False


class NotificationEscalationCheckResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated_at: str
    dry_run: bool = True
    run_id: str | None = None
    candidates: list[NotificationEscalationCandidate] = Field(default_factory=list)
    created_notifications: list[str] = Field(default_factory=list)
    candidate_count: int = 0
    event_count: int = 0
    urgent_count: int = 0
    safeguarding_count: int = 0
    recording_count: int = 0
    isn_count: int = 0
    daily_brief_count: int = 0
    warnings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class NotificationEscalationHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    service: str = "os_notification_escalation_service"
    persistence_available: bool = False
    storage_mode: str = "memory"
    rules_count: int = 0
    events_count: int = 0
