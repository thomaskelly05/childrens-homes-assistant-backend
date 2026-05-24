"""Recording governance dashboard routes — authenticated OS only."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.recording_governance import RecordingGovernanceFilters
from services.recording_governance_service import recording_governance_service

router = APIRouter(prefix="/recording-governance", tags=["Recording Governance"])
compat_router = APIRouter(prefix="/api/recording-governance", tags=["Recording Governance API"])


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


def _filters_from_query(
    *,
    child_id: int | None = None,
    home_id: int | None = None,
    recording_type: str | None = None,
    category: str | None = None,
    status: str | None = None,
    review_status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    high_risk_only: bool = False,
    safeguarding_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> RecordingGovernanceFilters:
    return RecordingGovernanceFilters(
        child_id=child_id,
        home_id=home_id,
        recording_type=recording_type,
        category=category,
        status=status,
        review_status=review_status,
        date_from=date_from,
        date_to=date_to,
        high_risk_only=high_risk_only,
        safeguarding_only=safeguarding_only,
        limit=limit,
        offset=offset,
    )


def _require_governance_view(current_user: dict[str, Any]) -> None:
    if not recording_governance_service.enforce_governance_access(current_user):
        raise HTTPException(
            status_code=403,
            detail="Recording governance dashboard requires manager or senior oversight role.",
        )


@router.get("/health")
async def recording_governance_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    return _success(recording_governance_service.get_health(conn=conn).model_dump())


@compat_router.get("/health")
async def api_recording_governance_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_governance_health(current_user=current_user, conn=conn)


@router.get("/dashboard")
async def recording_governance_dashboard(
    child_id: int | None = None,
    home_id: int | None = None,
    recording_type: str | None = None,
    category: str | None = None,
    status: str | None = None,
    review_status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    high_risk_only: bool = False,
    safeguarding_only: bool = False,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_governance_view(user)
    filters = _filters_from_query(
        child_id=child_id,
        home_id=home_id,
        recording_type=recording_type,
        category=category,
        status=status,
        review_status=review_status,
        date_from=date_from,
        date_to=date_to,
        high_risk_only=high_risk_only,
        safeguarding_only=safeguarding_only,
    )
    dashboard = recording_governance_service.build_dashboard(user, filters, conn=conn)
    return _success(dashboard.model_dump())


@compat_router.get("/dashboard")
async def api_recording_governance_dashboard(
    child_id: int | None = None,
    home_id: int | None = None,
    recording_type: str | None = None,
    category: str | None = None,
    status: str | None = None,
    review_status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    high_risk_only: bool = False,
    safeguarding_only: bool = False,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_governance_dashboard(
        child_id=child_id,
        home_id=home_id,
        recording_type=recording_type,
        category=category,
        status=status,
        review_status=review_status,
        date_from=date_from,
        date_to=date_to,
        high_risk_only=high_risk_only,
        safeguarding_only=safeguarding_only,
        current_user=current_user,
        conn=conn,
    )


@router.get("/items")
async def recording_governance_items(
    child_id: int | None = None,
    home_id: int | None = None,
    recording_type: str | None = None,
    category: str | None = None,
    status: str | None = None,
    review_status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    high_risk_only: bool = False,
    safeguarding_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_governance_view(user)
    filters = _filters_from_query(
        child_id=child_id,
        home_id=home_id,
        recording_type=recording_type,
        category=category,
        status=status,
        review_status=review_status,
        date_from=date_from,
        date_to=date_to,
        high_risk_only=high_risk_only,
        safeguarding_only=safeguarding_only,
        limit=limit,
        offset=offset,
    )
    items = recording_governance_service.list_governance_items(user, filters, conn=conn)
    return _success({"items": [item.model_dump() for item in items], "total": len(items)})


@compat_router.get("/items")
async def api_recording_governance_items(
    child_id: int | None = None,
    home_id: int | None = None,
    recording_type: str | None = None,
    category: str | None = None,
    status: str | None = None,
    review_status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    high_risk_only: bool = False,
    safeguarding_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_governance_items(
        child_id=child_id,
        home_id=home_id,
        recording_type=recording_type,
        category=category,
        status=status,
        review_status=review_status,
        date_from=date_from,
        date_to=date_to,
        high_risk_only=high_risk_only,
        safeguarding_only=safeguarding_only,
        limit=limit,
        offset=offset,
        current_user=current_user,
        conn=conn,
    )


@router.get("/alerts")
async def recording_governance_alerts(
    child_id: int | None = None,
    home_id: int | None = None,
    safeguarding_only: bool = False,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_governance_view(user)
    filters = _filters_from_query(child_id=child_id, home_id=home_id, safeguarding_only=safeguarding_only)
    dashboard = recording_governance_service.build_dashboard(user, filters, conn=conn)
    return _success([alert.model_dump() for alert in dashboard.alerts])


@compat_router.get("/alerts")
async def api_recording_governance_alerts(
    child_id: int | None = None,
    home_id: int | None = None,
    safeguarding_only: bool = False,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_governance_alerts(
        child_id=child_id,
        home_id=home_id,
        safeguarding_only=safeguarding_only,
        current_user=current_user,
        conn=conn,
    )


@router.get("/form-usage")
async def recording_governance_form_usage(
    child_id: int | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_governance_view(user)
    filters = _filters_from_query(child_id=child_id, home_id=home_id)
    dashboard = recording_governance_service.build_dashboard(user, filters, conn=conn)
    return _success([item.model_dump() for item in dashboard.form_usage])


@compat_router.get("/form-usage")
async def api_recording_governance_form_usage(
    child_id: int | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_governance_form_usage(
        child_id=child_id, home_id=home_id, current_user=current_user, conn=conn
    )


@router.get("/quality")
async def recording_governance_quality(
    child_id: int | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_governance_view(user)
    filters = _filters_from_query(child_id=child_id, home_id=home_id)
    dashboard = recording_governance_service.build_dashboard(user, filters, conn=conn)
    return _success(dashboard.quality.model_dump())


@compat_router.get("/quality")
async def api_recording_governance_quality(
    child_id: int | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_governance_quality(
        child_id=child_id, home_id=home_id, current_user=current_user, conn=conn
    )


@router.get("/backlog")
async def recording_governance_backlog(
    child_id: int | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_governance_view(user)
    filters = _filters_from_query(child_id=child_id, home_id=home_id)
    dashboard = recording_governance_service.build_dashboard(user, filters, conn=conn)
    return _success(dashboard.backlog.model_dump())


@compat_router.get("/backlog")
async def api_recording_governance_backlog(
    child_id: int | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_governance_backlog(
        child_id=child_id, home_id=home_id, current_user=current_user, conn=conn
    )
