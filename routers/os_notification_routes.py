"""Operational notification feed and lifecycle actions for the OS notification bell."""

from __future__ import annotations

from typing import Any
from urllib.parse import unquote

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.os_notifications import OsNotificationActionRequest
from schemas.os_notification_analytics import NotificationAnalyticsFilters
from schemas.os_notification_preferences import (
    NotificationEscalationCheckRequest,
    NotificationEscalationRule,
    NotificationPreferenceUpdateRequest,
)
from services.os_notification_adapter_service import os_notification_adapter_service
from services.os_notification_analytics_service import os_notification_analytics_service
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


@router.get("/escalations/runs")
async def list_notification_escalation_runs(
    home_id: int | None = None,
    limit: int = Query(20, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters = NotificationAnalyticsFilters(home_id=home_id) if home_id else None
    runs = os_notification_escalation_service.list_check_runs(
        current_user, filters=filters, conn=conn, limit=limit
    )
    return _success([r.model_dump() for r in runs])


@router.get("/escalations/last-run")
async def get_last_notification_escalation_run(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    run = os_notification_escalation_service.get_last_check_run(current_user, conn=conn)
    return _success(run.model_dump() if run else None)


@router.get("/analytics/health")
async def notification_analytics_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    return _success(os_notification_analytics_service.get_health(conn=conn))


@router.get("/analytics/response-metrics")
async def notification_response_metrics(
    home_id: int | None = None,
    source: str | None = None,
    category: str | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters = NotificationAnalyticsFilters(home_id=home_id, source=source, category=category)
    metrics = os_notification_analytics_service.build_response_metrics(
        current_user, filters=filters, conn=conn
    )
    return _success(metrics.model_dump())


@router.get("/analytics/governance-summary")
async def notification_governance_summary(
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters = NotificationAnalyticsFilters(home_id=home_id) if home_id else None
    summary = os_notification_analytics_service.build_governance_summary(
        current_user, filters=filters, conn=conn
    )
    return _success(summary.model_dump())


@router.get("/automation/health")
async def notification_automation_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    health = os_notification_analytics_service.build_automation_health(current_user, conn=conn)
    return _success(health.model_dump())


@router.get("/operational-feed")
async def operational_notification_feed(
    unread_only: bool = False,
    limit: int = Query(30, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    import logging
    import time

    started = time.perf_counter()
    feed, cache_lookup = os_notification_adapter_service.build_feed_cached(
        current_user,
        limit=limit,
        unread_only=unread_only,
        conn=conn,
    )
    payload = feed.model_dump()
    payload["cache_status"] = cache_lookup.status
    payload["degraded"] = bool((payload.get("metadata") or {}).get("degraded")) or cache_lookup.stale
    logging.getLogger("indicare.os_notifications").info(
        "operational_notification_feed endpoint=/api/notifications/operational-feed total_ms=%s cache_status=%s degraded=%s warning_count=%s",
        round((time.perf_counter() - started) * 1000, 2),
        cache_lookup.status,
        payload.get("degraded"),
        len(payload.get("limitations") or []),
    )
    return _success(payload)


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
