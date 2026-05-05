from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from services.realtime_alerts_service import RealtimeAlertsService

router = APIRouter(prefix="/alerts", tags=["realtime-alerts"])

service = RealtimeAlertsService()


@router.get("/active")
def active_alerts(
    days: int = 30,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.active_alerts(current_user=current_user, days=days, home_id=home_id)


@router.get("/child/{young_person_id}")
def child_alerts(
    young_person_id: int,
    days: int = 30,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.child_alerts(young_person_id=young_person_id, current_user=current_user, days=days)


@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: str,
    payload: dict[str, Any] | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    comment = (payload or {}).get("comment")
    return service.acknowledge_alert(alert_id=alert_id, current_user=current_user, comment=comment)


@router.post("/{alert_id}/escalate")
def escalate_alert(
    alert_id: str,
    payload: dict[str, Any] | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    comment = (payload or {}).get("comment")
    return service.escalate_alert(alert_id=alert_id, current_user=current_user, comment=comment)
