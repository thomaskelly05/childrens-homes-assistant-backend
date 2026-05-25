"""Operational notification feed adapter — metadata-only items for the OS bell."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

OsNotificationSeverity = Literal["low", "medium", "high", "urgent"]
OsNotificationSource = Literal[
    "notifications_table",
    "recording_alerts",
    "manager_daily_brief",
    "connect",
]

OsNotificationType = Literal[
    "connect_message",
    "handover",
    "recording_alert_urgent",
    "recording_alert_safeguarding",
    "recording_alert_review_due",
    "recording_alert_privacy",
    "recording_alert_changes_requested",
    "recording_alert_missing_follow_up",
    "recording_alert_medication_review",
    "recording_alert_structured_missing",
    "manager_daily_brief_reminder",
    "generic",
]


class OsNotificationItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    type: OsNotificationType | str
    title: str
    safe_summary: str
    severity: OsNotificationSeverity = "medium"
    status: str = "open"
    unread: bool = True
    route: str
    action_label: str | None = None
    source: OsNotificationSource | str = "recording_alerts"
    created_at: str
    category: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class OsNotificationFeedHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    service: str = "os_notification_adapter_service"
    persistence_available: bool = False
    recording_alerts_available: bool = True
    manager_daily_brief_available: bool = True


class OsNotificationFeed(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[OsNotificationItem] = Field(default_factory=list)
    unread: int = 0
    urgent: int = 0
    recording_alert_count: int = 0
    daily_brief_unread: bool = False
    categories: dict[str, int] = Field(default_factory=dict)
    privacy_notice: str = (
        "Notification items use metadata-only summaries. They do not replace manager judgement."
    )
    limitations: list[str] = Field(default_factory=list)
    available: bool = True
