"""ISN operational notification shapes — metadata-only, no raw safeguarding narrative."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

IsnNotificationSeverity = Literal["low", "medium", "high", "urgent"]
IsnNotificationType = Literal[
    "isn_safeguarding_alert",
    "isn_review_required",
    "isn_escalation_required",
    "isn_network_update",
    "isn_follow_up_due",
    "isn_professional_update",
    "isn_recording_linked_alert",
    "isn_manager_action_required",
]


class IsnNotificationItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    source: Literal["isn"] = "isn"
    type: IsnNotificationType | str
    title: str
    safe_summary: str
    severity: IsnNotificationSeverity = "medium"
    status: str = "open"
    route: str
    action_label: str | None = None
    child_id: int | None = None
    home_id: int | None = None
    created_at: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class IsnNotificationRoutes(BaseModel):
    model_config = ConfigDict(extra="ignore")

    safeguarding: str = "/safeguarding"
    alerts: str = "/safeguarding"
    recording_alerts: str = "/record/alerts"
    orb: str = "/assistant/orb?mode=safeguarding_themes"
    care_hub: str = "/command-centre"
    briefing: str = "/command-centre/briefing"


class IsnDigestTopItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    safe_summary: str
    severity: IsnNotificationSeverity = "medium"
    type: str
    route: str
    action_label: str | None = None
    status: str = "open"


class IsnDigest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated_at: str
    available: bool = True
    total_open: int = 0
    urgent: int = 0
    high: int = 0
    review_required: int = 0
    escalation_required: int = 0
    follow_up_due: int = 0
    network_updates: int = 0
    linked_recording_alerts: int = 0
    top_items: list[IsnDigestTopItem] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    routes: IsnNotificationRoutes = Field(default_factory=IsnNotificationRoutes)
    privacy_notice: str = (
        "ISN summaries use metadata only. They support safeguarding oversight; "
        "they do not replace professional judgement or make referral decisions."
    )
    limitations: list[str] = Field(default_factory=list)


class IsnBadgeSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    unread: int = 0
    urgent: int = 0
    review_required: int = 0
    available: bool = True


class IsnNotificationHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    service: str = "isn_digest_service"
    persistence_available: bool = False
    storage_mode: str = "unknown"


IsnNotificationLifecycleStatus = Literal[
    "unread",
    "read",
    "acknowledged",
    "assigned",
    "resolved",
    "archived",
]

IsnNotificationActionType = Literal[
    "acknowledge",
    "assign",
    "resolve",
    "archive",
    "reopen",
    "create_intelligence_action",
]


class IsnNotificationActionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    action: IsnNotificationActionType
    note: str | None = None
    owner_user_id: str | None = None
    owner_name: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class IsnNotificationActionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool = True
    item_id: str
    action: str
    status: str = "acknowledged"
    message: str | None = None
    warning: str | None = None
    synced_to_os_state: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)
