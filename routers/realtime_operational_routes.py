from __future__ import annotations

from collections.abc import Generator
from typing import Any

from fastapi import APIRouter, Depends, Query, WebSocket

from auth.current_user import get_current_user
from db.connection import get_db
from services.inspection_evidence_pack_service import inspection_evidence_pack_service
from services.predictive_safeguarding_service import predictive_safeguarding_service
from services.provider_command_centre_service import provider_command_centre_service
from services.realtime_event_bus import realtime_event_bus
from services.realtime_operational_stream_service import realtime_operational_stream_service
from services.reg44_intelligence_service import reg44_intelligence_service
from services.reg45_generation_service import reg45_generation_service
from services.staff_wellbeing_service import staff_wellbeing_service
from services.websocket_operational_gateway import websocket_operational_gateway
from services.workforce_pressure_service import workforce_pressure_service
from services.intelligence.event_bus.operational_event_bus import operational_event_bus

router = APIRouter(prefix="/os/realtime", tags=["Realtime Operational"])
compat_router = APIRouter(prefix="/api/os-command/realtime", tags=["Realtime Operational Compatibility"])


def _db() -> Generator[Any, None, None]:
    yield from get_db()


def _scope(
    young_person_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    return {"young_person_id": young_person_id, "home_id": home_id, "limit": limit}


@router.websocket("/ws")
async def operational_realtime_ws(websocket: WebSocket) -> None:
    from db.connection import get_db_connection, release_db_connection

    conn = get_db_connection()
    try:
        await websocket_operational_gateway.handle(websocket, conn=conn)
    finally:
        release_db_connection(conn)


@router.get("/stream")
def operational_stream_snapshot(
    params: dict[str, Any] = Depends(_scope),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    user = current_user if isinstance(current_user, dict) else dict(current_user or {})
    return realtime_operational_stream_service.build_stream_snapshot(conn, current_user=user, **params)


@router.post("/propagate")
def operational_stream_propagate(
    params: dict[str, Any] = Depends(_scope),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    user = current_user if isinstance(current_user, dict) else dict(current_user or {})
    return realtime_operational_stream_service.propagate_feed_update(conn, actor=user, **params)


@router.get("/replay")
def operational_stream_replay(
    home_id: int = Query(...),
    after_cursor: int | None = Query(default=None),
    since: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    current_user=Depends(get_current_user),
) -> dict[str, Any]:
    user = current_user if isinstance(current_user, dict) else dict(current_user or {})
    return realtime_event_bus.replay_for_user(
        current_user=user,
        home_id=home_id,
        after_cursor=after_cursor,
        since=since,
        limit=limit,
    )


@router.get("/health")
def operational_realtime_health() -> dict[str, Any]:
    return {"ok": True, "gateway": "operational", "supported": True}


@router.get("/event-bus/metrics")
def operational_event_bus_metrics(_current_user=Depends(get_current_user)) -> dict[str, Any]:
    return {"ok": True, **operational_event_bus.event_metrics(), "dead_letter": operational_event_bus.dead_letter_queue()}


@router.get("/predictive-safeguarding")
def predictive_safeguarding(
    params: dict[str, Any] = Depends(_scope),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return predictive_safeguarding_service.analyse(conn, **params)


@router.get("/workforce-pressure")
def workforce_pressure(
    home_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    user = current_user if isinstance(current_user, dict) else dict(current_user or {})
    return workforce_pressure_service.build(conn, current_user=user, home_id=home_id, limit=limit)


@router.get("/staff-wellbeing")
def staff_wellbeing(
    staff_id: int | None = Query(default=None),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    user = current_user if isinstance(current_user, dict) else dict(current_user or {})
    return staff_wellbeing_service.build(conn, current_user=user, staff_id=staff_id)


@router.get("/inspection/reg44")
def inspection_reg44(
    home_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return reg44_intelligence_service.build(conn, home_id=home_id, limit=limit)


@router.get("/inspection/reg45")
def inspection_reg45(
    home_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return reg45_generation_service.generate(conn, home_id=home_id, limit=limit)


@router.get("/inspection/evidence-pack")
def inspection_evidence_pack(
    home_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return inspection_evidence_pack_service.build(conn, home_id=home_id, limit=limit)


@router.get("/provider-command-centre")
def provider_command_centre(
    limit: int = Query(default=30, ge=1, le=100),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    user = current_user if isinstance(current_user, dict) else dict(current_user or {})
    return provider_command_centre_service.build(conn, current_user=user, limit=limit)


@compat_router.get("/stream")
def operational_stream_compat(
    params: dict[str, Any] = Depends(_scope),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return operational_stream_snapshot(params=params, current_user=current_user, conn=conn)


@compat_router.get("/replay")
def operational_replay_compat(
    home_id: int = Query(...),
    after_cursor: int | None = Query(default=None),
    since: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    current_user=Depends(get_current_user),
) -> dict[str, Any]:
    return operational_stream_replay(
        home_id=home_id,
        after_cursor=after_cursor,
        since=since,
        limit=limit,
        current_user=current_user,
    )
