"""Operational notification feed — metadata-only items for the OS bell and notification centre."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

OsNotificationSeverity = Literal["low", "medium", "high", "urgent"]

OsNotificationSource = Literal[
    "notifications_table",
    "recording_alerts",
    "recording_alert",
    "isn",
    "manager_daily_brief",
    "recording_review",
    "intelligence_action",
    "governance",
    "connect",
    "system",
]

OsNotificationCategory = Literal[
    "recording",
    "safeguarding_network",
    "daily_brief",
    "review",
    "action",
    "governance",
    "handover",
    "system",
]

OsNotificationStatus = Literal[
    "unread",
    "read",
    "acknowledged",
    "assigned",
    "resolved",
    "archived",
]

OsNotificationActionType = Literal[
    "mark_read",
    "mark_unread",
    "acknowledge",
    "assign",
    "resolve",
    "archive",
    "reopen",
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
    "isn_safeguarding_alert",
    "isn_review_required",
    "isn_escalation_required",
    "isn_network_update",
    "isn_follow_up_due",
    "isn_professional_update",
    "isn_recording_linked_alert",
    "isn_manager_action_required",
    "recording_review_due",
    "intelligence_action_due",
    "governance_notice",
    "generic",
]


class OsNotificationItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    notification_key: str | None = None
    source: OsNotificationSource | str = "recording_alerts"
    category: OsNotificationCategory | str | None = None
    type: OsNotificationType | str
    title: str
    safe_summary: str
    severity: OsNotificationSeverity = "medium"
    status: OsNotificationStatus | str = "unread"
    unread: bool = True
    route: str
    action_label: str | None = None
    related_id: str | None = None
    related_type: str | None = None
    child_id: int | None = None
    child_name: str | None = None
    home_id: int | None = None
    owner_user_id: str | None = None
    owner_name: str | None = None
    created_at: str
    read_at: str | None = None
    acknowledged_at: str | None = None
    resolved_at: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    metadata_only: bool = True
    no_raw_body: bool = True


class OsNotificationActionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    action: OsNotificationActionType
    note: str | None = None
    owner_user_id: str | None = None
    owner_name: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class OsNotificationActionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool = True
    notification_key: str
    action: str
    status: str = "read"
    unread: bool = False
    message: str | None = None
    warning: str | None = None
    synced_to_source: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class OsNotificationSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    unread_count: int = 0
    urgent_count: int = 0
    recording_count: int = 0
    isn_count: int = 0
    daily_brief_count: int = 0
    review_count: int = 0
    action_count: int = 0
    governance_count: int = 0
    generated_at: str
    available: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)


class OsNotificationHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    service: str = "os_notification_state_service"
    persistence_available: bool = False
    recording_alerts_available: bool = True
    manager_daily_brief_available: bool = True
    isn_available: bool = True
    storage_mode: str = "memory"


class OsNotificationFeedHealth(OsNotificationHealth):
    """Backward-compatible health shape for adapter routes."""

    service: str = "os_notification_adapter_service"


class OsNotificationFeedResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[OsNotificationItem] = Field(default_factory=list)
    unread_count: int = 0
    urgent_count: int = 0
    recording_count: int = 0
    isn_count: int = 0
    daily_brief_count: int = 0
    review_count: int = 0
    action_count: int = 0
    governance_count: int = 0
    generated_at: str
    categories: dict[str, int] = Field(default_factory=dict)
    privacy_notice: str = (
        "Notification items use metadata-only summaries. They do not replace manager judgement."
    )
    limitations: list[str] = Field(default_factory=list)
    available: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)
    # Backward-compatible bell fields
    unread: int = 0
    urgent: int = 0
    recording_alert_count: int = 0
    daily_brief_unread: bool = False


# Alias for existing imports
OsNotificationFeed = OsNotificationFeedResponse
