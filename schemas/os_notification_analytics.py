"""Notification analytics and escalation run history — metadata only, no raw bodies."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from schemas.os_notification_preferences import NotificationEscalationCandidate


class NotificationEscalationRunRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    triggered_by_user_id: str | None = None
    triggered_by_name: str | None = None
    home_id: int | None = None
    dry_run: bool = True
    started_at: str
    completed_at: str | None = None
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


class NotificationResponseMetric(BaseModel):
    model_config = ConfigDict(extra="ignore")

    total_notifications: int = 0
    unread: int = 0
    acknowledged: int = 0
    resolved: int = 0
    archived: int = 0
    urgent_unacknowledged: int = 0
    safeguarding_unacknowledged: int = 0
    average_minutes_to_read: float | None = None
    average_minutes_to_acknowledge: float | None = None
    average_minutes_to_resolve: float | None = None
    oldest_unacknowledged_minutes: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class NotificationGovernanceSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated_at: str
    feed_health: str = "ok"
    preference_health: str = "ok"
    escalation_health: str = "ok"
    urgent_override_active: bool = True
    push_configured: bool = False
    email_configured: bool = False
    last_escalation_check: NotificationEscalationRunRecord | None = None
    response_metrics: NotificationResponseMetric = Field(default_factory=NotificationResponseMetric)
    unresolved_escalation_candidates: list[NotificationEscalationCandidate] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class NotificationAutomationHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    manual_checks_available: bool = True
    scheduler_configured: bool = False
    push_configured: bool = False
    email_configured: bool = False
    last_check_at: str | None = None
    warnings: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class NotificationAnalyticsFilters(BaseModel):
    model_config = ConfigDict(extra="ignore")

    home_id: int | None = None
    user_id: str | None = None
    source: str | None = None
    category: str | None = None
    date_from: str | None = None
    date_to: str | None = None
    severity: Literal["low", "medium", "high", "urgent"] | str | None = None
