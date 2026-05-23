"""AI privacy governance routes — auth required, metadata only."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.ai_privacy import (
    AiPermissionCheckRequest,
    AiPrivacyDashboardResponse,
    AiPrivacyFilter,
    AiRedactionRequest,
)
from services.ai_permission_guard_service import ai_permission_guard_service
from services.ai_privacy_audit_service import ai_privacy_audit_service
from services.ai_privacy_guard_service import ai_privacy_guard_service
from services.ai_redaction_service import ai_redaction_service

router = APIRouter(prefix="/intelligence/governance/privacy", tags=["intelligence-ai-privacy"])


def _ensure_privacy_access(current_user: dict[str, Any]) -> dict[str, Any]:
    if not ai_permission_guard_service.can_view_ai_governance(current_user):
        from auth.errors import forbidden

        raise forbidden("permission_denied", "You do not have permission to view AI privacy governance.")
    return current_user


@router.get("/health")
def privacy_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = _ensure_privacy_access(current_user)
    health = ai_privacy_audit_service.build_health(conn=conn)
    return {"success": True, "data": health.model_dump(mode="json")}


@router.get("/dashboard")
def privacy_dashboard(
    period: str = Query(default="7d"),
    surface: str | None = None,
    home_id: int | None = None,
    limit: int = Query(default=25, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = _ensure_privacy_access(current_user)
    filters = AiPrivacyFilter(
        period=period,  # type: ignore[arg-type]
        surface=surface,  # type: ignore[arg-type]
        home_id=home_id or current_user.get("home_id"),
        limit=limit,
    )
    summary = ai_privacy_audit_service.get_privacy_summary(filters, conn=conn)
    alerts = ai_privacy_audit_service.get_privacy_alerts(filters, conn=conn)
    events = ai_privacy_audit_service.get_recent_events(
        AiPrivacyFilter(**{**filters.model_dump(), "limit": min(limit, 50)}),
        conn=conn,
    )
    health = ai_privacy_audit_service.build_health(conn=conn)
    response = AiPrivacyDashboardResponse(
        summary=summary,
        health=health,
        alerts=alerts,
        recent_events=events,
    )
    return {"success": True, "data": response.model_dump(mode="json")}


@router.get("/events")
def privacy_events(
    period: str = Query(default="7d"),
    surface: str | None = None,
    home_id: int | None = None,
    decision: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = _ensure_privacy_access(current_user)
    filters = AiPrivacyFilter(
        period=period,  # type: ignore[arg-type]
        surface=surface,  # type: ignore[arg-type]
        home_id=home_id,
        decision=decision,  # type: ignore[arg-type]
        limit=limit,
    )
    events = ai_privacy_audit_service.get_recent_events(filters, conn=conn)
    return {"success": True, "data": [e.model_dump(mode="json") for e in events]}


@router.get("/alerts")
def privacy_alerts(
    period: str = Query(default="7d"),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = _ensure_privacy_access(current_user)
    alerts = ai_privacy_audit_service.get_privacy_alerts(AiPrivacyFilter(period=period), conn=conn)  # type: ignore[arg-type]
    return {"success": True, "data": [a.model_dump(mode="json") for a in alerts]}


@router.post("/check")
def privacy_check(
    payload: AiPermissionCheckRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _ = current_user
    result = ai_permission_guard_service.check_permission(payload, current_user)
    return {"success": True, "data": result.model_dump(mode="json")}


@router.post("/redact-preview")
def redact_preview(
    payload: AiRedactionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _ = current_user
    result = ai_redaction_service.redact_to_result(
        payload.text,
        mode=payload.mode,
        data_classes=payload.data_classes,
        known_names=payload.known_names,
    )
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "warning": "Automated redaction may not catch every identifier. Review before sharing or exporting.",
    }
