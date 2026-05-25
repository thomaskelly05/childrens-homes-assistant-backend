"""Operational notification feed and lifecycle actions for the OS notification bell."""

from __future__ import annotations

from typing import Any
from urllib.parse import unquote

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.os_notifications import OsNotificationActionRequest
from schemas.os_notification_preferences import (
    NotificationEscalationCheckRequest,
    NotificationEscalationRule,
    NotificationPreferenceUpdateRequest,
)
from services.os_notification_adapter_service import os_notification_adapter_service
from services.os_notification_escalation_service import os_notification_escalation_service
from services.os_notification_preference_service import os_notification_preference_service
from services.os_notification_state_service import os_notification_state_service

router = APIRouter(prefix="/api/notifications", tags=["OS Notifications"])
compat_router = APIRouter(prefix="/notifications", tags=["OS Notifications"])


class MarkAllReadRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    notification_keys: list[str] = Field(default_factory=list)


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "operational_only": True,
        "standalone_access": False,
        "metadata_only": True,
    }


@router.get("/preferences/health")
async def notification_preferences_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    return _success(os_notification_preference_service.get_health(conn=conn).model_dump())


@router.get("/preferences")
async def get_notification_preferences(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return _success(
        os_notification_preference_service.get_preferences(current_user, conn=conn).model_dump()
    )


@router.patch("/preferences")
async def update_notification_preferences(
    payload: NotificationPreferenceUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    result = os_notification_preference_service.update_preferences(
        current_user, payload, conn=conn
    )
    return _success(result.model_dump())


@router.get("/escalations/health")
async def notification_escalations_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    return _success(os_notification_escalation_service.get_health(conn=conn).model_dump())


@router.get("/escalations/rules")
async def list_notification_escalation_rules(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    rules = os_notification_escalation_service.list_escalation_rules(current_user, conn=conn)
    return _success([r.model_dump() for r in rules])


@router.post("/escalations/rules")
async def create_or_update_notification_escalation_rule(
    rule: NotificationEscalationRule,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    saved = os_notification_escalation_service.create_or_update_rule(current_user, rule, conn=conn)
    return _success(saved.model_dump())


@router.post("/escalations/check")
async def run_notification_escalation_check(
    payload: NotificationEscalationCheckRequest | None = Body(None),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    result = os_notification_escalation_service.run_escalation_check(
        current_user,
        request=payload or NotificationEscalationCheckRequest(dry_run=True),
        conn=conn,
    )
    return _success(result.model_dump())


@router.get("/operational-feed")
async def operational_notification_feed(
    unread_only: bool = False,
    limit: int = Query(30, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    feed = os_notification_adapter_service.build_feed(
        current_user,
        limit=limit,
        unread_only=unread_only,
        conn=conn,
    )
    return _success(feed.model_dump())


@router.get("/operational-summary")
async def operational_notification_summary(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    summary = os_notification_adapter_service.build_summary(current_user, conn=conn)
    return _success(summary.model_dump())


@router.get("/operational-feed/health")
async def operational_notification_feed_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    return _success(os_notification_adapter_service.get_health(conn=conn).model_dump())


@router.post("/mark-all-read")
async def mark_all_operational_notifications_read(
    payload: MarkAllReadRequest | None = Body(None),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    keys = list(payload.notification_keys) if payload and payload.notification_keys else []
    if not keys:
        feed = os_notification_adapter_service.build_feed(current_user, limit=100, conn=conn)
        keys = [
            item.notification_key or item.id
            for item in feed.items
            if item.unread
        ]
    result = os_notification_state_service.mark_all_read(keys, current_user, conn=conn)
    return _success(result)


@router.post("/{notification_key:path}/action")
async def operational_notification_action(
    notification_key: str,
    action: OsNotificationActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    key = unquote(notification_key).strip()
    if not key:
        raise HTTPException(status_code=400, detail="notification_key required")
    prefix = key.split(":", 1)[0] if ":" in key else key
    source_map = {
        "recording_alert": "recording_alert",
        "isn": "isn",
        "manager_daily_brief": "manager_daily_brief",
        "recording_review": "recording_review",
        "intelligence_action": "intelligence_action",
        "governance": "governance",
    }
    result = os_notification_state_service.set_state(
        key,
        action,
        current_user,
        source=source_map.get(prefix, prefix),
        category=action.metadata.get("category"),
        item_type=action.metadata.get("item_type"),
        conn=conn,
    )
    return _success(result.model_dump())


@compat_router.get("/operational-feed")
async def compat_operational_notification_feed(
    unread_only: bool = False,
    limit: int = Query(30, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await operational_notification_feed(
        unread_only=unread_only,
        limit=limit,
        current_user=current_user,
        conn=conn,
    )


@compat_router.get("/operational-summary")
async def compat_operational_notification_summary(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await operational_notification_summary(current_user=current_user, conn=conn)


@compat_router.post("/mark-all-read")
async def compat_mark_all_operational_notifications_read(
    payload: MarkAllReadRequest | None = Body(None),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await mark_all_operational_notifications_read(
        payload=payload,
        current_user=current_user,
        conn=conn,
    )


@compat_router.post("/{notification_key:path}/action")
async def compat_operational_notification_action(
    notification_key: str,
    action: OsNotificationActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await operational_notification_action(
        notification_key=notification_key,
        action=action,
        current_user=current_user,
        conn=conn,
    )
