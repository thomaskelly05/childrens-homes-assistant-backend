from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.current_user import get_current_user
from db.connection import get_db
from services.care_hub_intelligence_service import care_hub_intelligence_service
from services.care_hub_safeguarding_queues_service import care_hub_safeguarding_queues_service

router = APIRouter(prefix="/os/care-hub", tags=["Care Hub"])
compat_router = APIRouter(prefix="/api/os-command", tags=["Care Hub Compatibility"])


def _scope_params(
    young_person_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    return {"young_person_id": young_person_id, "home_id": home_id, "limit": limit}


@router.get("")
def care_hub_dashboard(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return care_hub_intelligence_service.build(conn, **params)


@router.get("/live")
def care_hub_live(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    payload = care_hub_intelligence_service.build(conn, **params)
    return {
        "ok": True,
        "live_status": payload.get("live_status"),
        "risk_matrix": payload.get("risk_matrix"),
        "alerts": payload.get("alerts"),
        "operational_feed": {
            "event_count": (payload.get("operational_feed") or {}).get("event_count"),
            "events": (payload.get("operational_feed") or {}).get("events"),
            "manager_queue": (payload.get("operational_feed") or {}).get("manager_queue"),
            "home_operational_intelligence": (payload.get("operational_feed") or {}).get("home_operational_intelligence"),
            "orb_operational_memory": (payload.get("operational_feed") or {}).get("orb_operational_memory"),
        },
    }


@router.get("/alerts")
def care_hub_alerts(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    payload = care_hub_intelligence_service.build(conn, **params)
    return payload.get("alerts") or {"ok": True, "alerts": [], "total": 0}


@router.get("/inspection")
def care_hub_inspection(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    payload = care_hub_intelligence_service.build(conn, **params)
    feed = payload.get("operational_feed") or {}
    return {
        "ok": True,
        "inspection_intelligence": feed.get("inspection_intelligence"),
        "workflow_completion": payload.get("workflow_completion"),
        "risk_matrix": payload.get("risk_matrix"),
    }


@router.get("/workforce")
def care_hub_workforce(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    payload = care_hub_intelligence_service.build(conn, **params)
    feed = payload.get("operational_feed") or {}
    return {
        "ok": True,
        "manager_queue": feed.get("manager_queue"),
        "live_status": payload.get("live_status"),
        "workforce_pressure": (feed.get("home_operational_intelligence") or {}).get("home_climate", {}).get(
            "workforce_pressure"
        ),
    }


@router.get("/safeguarding")
def care_hub_safeguarding(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    payload = care_hub_intelligence_service.build(conn, **params)
    feed = payload.get("operational_feed") or {}
    queues = care_hub_safeguarding_queues_service.build_from_feed(feed)
    return {
        "ok": True,
        "safeguarding_pressure": (feed.get("home_operational_intelligence") or {}).get("home_climate", {}).get(
            "safeguarding_pressure"
        ),
        "chronology_patterns": payload.get("chronology_patterns"),
        "safeguarding_queues": queues,
        "alerts": [alert for alert in (payload.get("alerts") or {}).get("alerts") or [] if alert.get("type", "").startswith("safeguarding") or "missing" in str(alert.get("type", ""))],
    }


@router.get("/safeguarding-queues")
def care_hub_safeguarding_queues(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    payload = care_hub_intelligence_service.build(conn, **params)
    feed = payload.get("operational_feed") or {}
    return care_hub_safeguarding_queues_service.build_from_feed(feed)


@router.get("/provider")
def care_hub_provider(
    limit: int = Query(default=30, ge=1, le=100),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return care_hub_intelligence_service.build_provider_view(
        conn,
        current_user=current_user if isinstance(current_user, dict) else dict(current_user or {}),
        limit=limit,
    )


@compat_router.get("/care-hub")
def care_hub_compat(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return care_hub_intelligence_service.build(conn, **params)
