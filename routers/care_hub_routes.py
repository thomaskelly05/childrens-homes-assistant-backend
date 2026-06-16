from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.current_user import get_current_user
from db.connection import db_connection
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
    current_user=Depends(get_current_user),
) -> dict[str, Any]:
    user = current_user if isinstance(current_user, dict) else dict(current_user or {})
    return care_hub_intelligence_service.build(current_user=user, **params)


@router.get("/live")
def care_hub_live(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
) -> dict[str, Any]:
    payload = care_hub_intelligence_service.build(**params)
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
) -> dict[str, Any]:
    payload = care_hub_intelligence_service.build(**params)
    return payload.get("alerts") or {"ok": True, "alerts": [], "total": 0}


@router.get("/inspection")
def care_hub_inspection(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
) -> dict[str, Any]:
    payload = care_hub_intelligence_service.build(**params)
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
    current_user=Depends(get_current_user),
) -> dict[str, Any]:
    from services.staff_wellbeing_service import staff_wellbeing_service
    from services.workforce_pressure_service import workforce_pressure_service

    payload = care_hub_intelligence_service.build(**params)
    feed = payload.get("operational_feed") or {}
    user = current_user if isinstance(current_user, dict) else dict(current_user or {})
    with db_connection() as conn:
        workforce_pressure = payload.get("workforce_pressure") or workforce_pressure_service.build(
            conn, current_user=user, home_id=params.get("home_id"), limit=params.get("limit", 50)
        )
        staff_wellbeing = staff_wellbeing_service.build(conn, current_user=user)
    return {
        "ok": True,
        "manager_queue": feed.get("manager_queue"),
        "live_status": payload.get("live_status"),
        "workforce_pressure": workforce_pressure,
        "staff_wellbeing": staff_wellbeing,
    }


@router.get("/safeguarding")
def care_hub_safeguarding(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
) -> dict[str, Any]:
    from services.predictive_safeguarding_service import predictive_safeguarding_service

    payload = care_hub_intelligence_service.build(**params)
    feed = payload.get("operational_feed") or {}
    queues = care_hub_safeguarding_queues_service.build_from_feed(feed)
    predictive = payload.get("predictive_safeguarding")
    if predictive is None:
        with db_connection() as conn:
            predictive = predictive_safeguarding_service.analyse(conn, **params)
    return {
        "ok": True,
        "safeguarding_pressure": (feed.get("home_operational_intelligence") or {}).get("home_climate", {}).get(
            "safeguarding_pressure"
        ),
        "chronology_patterns": payload.get("chronology_patterns"),
        "predictive_safeguarding": predictive,
        "safeguarding_queues": queues,
        "alerts": [alert for alert in (payload.get("alerts") or {}).get("alerts") or [] if alert.get("type", "").startswith("safeguarding") or "missing" in str(alert.get("type", ""))],
    }


@router.get("/safeguarding-queues")
def care_hub_safeguarding_queues(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
) -> dict[str, Any]:
    payload = care_hub_intelligence_service.build(**params)
    feed = payload.get("operational_feed") or {}
    return care_hub_safeguarding_queues_service.build_from_feed(feed)


@router.get("/provider")
def care_hub_provider(
    limit: int = Query(default=30, ge=1, le=100),
    current_user=Depends(get_current_user),
) -> dict[str, Any]:
    from services.provider_command_centre_service import provider_command_centre_service

    user = current_user if isinstance(current_user, dict) else dict(current_user or {})
    with db_connection() as conn:
        return provider_command_centre_service.build(conn, current_user=user, limit=limit)


@router.get("/inspection evidence preparation")
def care_hub_inspection_readiness(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
) -> dict[str, Any]:
    from services.inspection_evidence_pack_service import inspection_evidence_pack_service
    from services.reg44_intelligence_service import reg44_intelligence_service

    with db_connection() as conn:
        return {
            "ok": True,
            "reg44": reg44_intelligence_service.build(conn, home_id=params.get("home_id"), limit=params.get("limit", 50)),
            "evidence_pack": inspection_evidence_pack_service.build(
                conn, home_id=params.get("home_id"), limit=params.get("limit", 50)
            ),
        }


@compat_router.get("/care-hub")
def care_hub_compat(
    params: dict[str, Any] = Depends(_scope_params),
    _current_user=Depends(get_current_user),
) -> dict[str, Any]:
    return care_hub_intelligence_service.build(**params)
