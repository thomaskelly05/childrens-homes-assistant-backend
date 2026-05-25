"""Recording alert routes — authenticated operational OS only."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.recording_alerts import (
    RecordingAlertActionRequest,
    RecordingAlertCheckRequest,
    RecordingAlertGenerationRequest,
    RecordingAlertListFilters,
)
from services.recording_alert_service import recording_alert_service

router = APIRouter(prefix="/recording-alerts", tags=["Recording Alerts"])
compat_router = APIRouter(prefix="/api/recording-alerts", tags=["Recording Alerts API"])


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "operational_only": True,
        "standalone_access": False,
        "metadata_only": True,
    }


def _user_dict(current_user: Any) -> dict[str, Any]:
    if isinstance(current_user, dict):
        return current_user
    return dict(current_user)


def _require_alert_view(current_user: dict[str, Any]) -> None:
    role = str(current_user.get("role") or "staff").lower()
    if not any(token in role for token in ("manager", "deputy", "senior", "registered", "admin")):
        raise HTTPException(
            status_code=403,
            detail="Recording alerts require manager or senior oversight role.",
        )


@router.get("/health")
async def recording_alerts_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    return _success(recording_alert_service.get_health(conn=conn).model_dump())


@compat_router.get("/health")
async def api_recording_alerts_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_alerts_health(current_user=current_user, conn=conn)


@router.get("")
async def list_recording_alerts(
    status: str | None = None,
    severity: str | None = None,
    alert_type: str | None = None,
    child_id: int | None = None,
    home_id: int | None = None,
    draft_id: str | None = None,
    safeguarding_only: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_alert_view(user)
    filters = RecordingAlertListFilters(
        status=status,  # type: ignore[arg-type]
        severity=severity,  # type: ignore[arg-type]
        alert_type=alert_type,  # type: ignore[arg-type]
        child_id=child_id,
        home_id=home_id,
        draft_id=draft_id,
        safeguarding_only=safeguarding_only,
        limit=limit,
        offset=offset,
    )
    result = recording_alert_service.list_alerts(user, filters, conn=conn)
    return _success(result.model_dump())


@compat_router.get("")
async def api_list_recording_alerts(
    status: str | None = None,
    severity: str | None = None,
    alert_type: str | None = None,
    child_id: int | None = None,
    home_id: int | None = None,
    draft_id: str | None = None,
    safeguarding_only: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await list_recording_alerts(
        status=status,
        severity=severity,
        alert_type=alert_type,
        child_id=child_id,
        home_id=home_id,
        draft_id=draft_id,
        safeguarding_only=safeguarding_only,
        limit=limit,
        offset=offset,
        current_user=current_user,
        conn=conn,
    )


@router.get("/summary")
async def recording_alerts_summary(
    child_id: int | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_alert_view(user)
    filters = RecordingAlertListFilters(child_id=child_id, home_id=home_id, limit=500)
    listed = recording_alert_service.list_alerts(user, filters, conn=conn)
    summary = recording_alert_service.build_alert_summary(listed.items)
    return _success(summary.model_dump())


@compat_router.get("/summary")
async def api_recording_alerts_summary(
    child_id: int | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_alerts_summary(
        child_id=child_id, home_id=home_id, current_user=current_user, conn=conn
    )


@router.get("/digest")
async def recording_alerts_digest(
    child_id: int | None = None,
    home_id: int | None = None,
    scope: str | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_alert_view(user)
    filters = RecordingAlertListFilters(child_id=child_id, home_id=home_id, limit=500)
    digest = recording_alert_service.build_digest(
        user, filters, conn=conn, scope=scope  # type: ignore[arg-type]
    )
    return _success(digest.model_dump())


@compat_router.get("/digest")
async def api_recording_alerts_digest(
    child_id: int | None = None,
    home_id: int | None = None,
    scope: str | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_alerts_digest(
        child_id=child_id, home_id=home_id, scope=scope, current_user=current_user, conn=conn
    )


@router.get("/badge-summary")
async def recording_alerts_badge_summary(
    child_id: int | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_alert_view(user)
    filters = RecordingAlertListFilters(child_id=child_id, home_id=home_id, limit=500)
    badge = recording_alert_service.build_badge_summary(user, filters, conn=conn)
    return _success(badge.model_dump())


@compat_router.get("/badge-summary")
async def api_recording_alerts_badge_summary(
    child_id: int | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_alerts_badge_summary(
        child_id=child_id, home_id=home_id, current_user=current_user, conn=conn
    )


@router.post("/run-checks")
async def run_recording_alert_checks(
    body: RecordingAlertCheckRequest | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_alert_view(user)
    run = recording_alert_service.run_alert_checks(user, body, conn=conn)
    return _success(run.model_dump())


@compat_router.post("/run-checks")
async def api_run_recording_alert_checks(
    body: RecordingAlertCheckRequest | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await run_recording_alert_checks(body=body, current_user=current_user, conn=conn)


@router.get("/last-check")
async def recording_alerts_last_check(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_alert_view(user)
    last = recording_alert_service.get_last_check(user, conn=conn)
    return _success(last.model_dump() if last else None)


@compat_router.get("/last-check")
async def api_recording_alerts_last_check(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_alerts_last_check(current_user=current_user, conn=conn)


@router.post("/generate")
async def generate_recording_alerts(
    body: RecordingAlertGenerationRequest | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_alert_view(user)
    result = recording_alert_service.generate_alerts(user, body, conn=conn)
    return _success(result.model_dump())


@compat_router.post("/generate")
async def api_generate_recording_alerts(
    body: RecordingAlertGenerationRequest | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await generate_recording_alerts(body=body, current_user=current_user, conn=conn)


@router.get("/{alert_id}")
async def get_recording_alert(
    alert_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_alert_view(user)
    alert = recording_alert_service.get_alert(alert_id, user, conn=conn)
    if not alert:
        raise HTTPException(status_code=404, detail="Recording alert not found or access denied.")
    return _success(alert.model_dump())


@compat_router.get("/{alert_id}")
async def api_get_recording_alert(
    alert_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await get_recording_alert(alert_id=alert_id, current_user=current_user, conn=conn)


@router.post("/{alert_id}/action")
async def apply_recording_alert_action(
    alert_id: str,
    body: RecordingAlertActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_alert_view(user)
    result = recording_alert_service.apply_alert_action(alert_id, body, user, conn=conn)
    if not result.success:
        raise HTTPException(status_code=400, detail=result.message or "Action failed.")
    return _success(result.model_dump())


@compat_router.post("/{alert_id}/action")
async def api_apply_recording_alert_action(
    alert_id: str,
    body: RecordingAlertActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await apply_recording_alert_action(
        alert_id=alert_id, body=body, current_user=current_user, conn=conn
    )
