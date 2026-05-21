from __future__ import annotations

from collections.abc import Generator
from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from schemas.isn_contracts import ISNSignalCreateRequest
from services.isn_contextual_safeguarding_service import isn_contextual_safeguarding_service
from services.isn_escalation_service import isn_escalation_service
from services.isn_relationship_service import isn_relationship_service
from services.isn_service import isn_service
from services.isn_timeline_service import isn_timeline_service
from services.isn_uk_transport_service import isn_uk_transport_service

router = APIRouter(prefix="/api/isn", tags=["isn"])


def _db() -> Generator[Any, None, None]:
    from db.connection import get_db

    yield from get_db()


@router.post("/signals")
def create_signal(
    payload: ISNSignalCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    record = isn_service.create_signal(conn, payload=payload, current_user=current_user)
    return {"ok": True, "item": record.model_dump(mode="json")}


@router.get("/signals")
def list_signals(
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    signal_type: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    response = isn_service.list_signals(
        conn,
        current_user=current_user,
        provider_id=provider_id,
        home_id=home_id,
        young_person_id=young_person_id,
        signal_type=signal_type,
        risk_level=risk_level,
        limit=limit,
    )
    return response.model_dump(mode="json")


@router.get("/hotspots")
def hotspots(
    limit: int = Query(default=500, ge=1, le=1000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    response = isn_service.hotspots(conn, current_user=current_user, limit=limit)
    return response.model_dump(mode="json")


@router.get("/alerts")
def alerts(
    status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    response = isn_service.alerts(conn, status=status, limit=limit)
    return response.model_dump(mode="json")


@router.get("/graph")
def graph(
    limit: int = Query(default=500, ge=1, le=2000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_relationship_service.graph(conn, current_user=current_user, limit=limit)


@router.get("/heatmap")
def heatmap(
    limit: int = Query(default=500, ge=1, le=2000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_relationship_service.heatmap(conn, current_user=current_user, limit=limit)


@router.get("/routes")
def routes(
    limit: int = Query(default=500, ge=1, le=2000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_relationship_service.routes(conn, current_user=current_user, limit=limit)


@router.get("/transport/corridors")
def transport_corridors(
    limit: int = Query(default=1000, ge=1, le=5000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_uk_transport_service.corridors(conn, current_user=current_user, limit=limit)


@router.get("/escalations")
def escalations(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=1000, ge=1, le=5000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_escalation_service.escalations(
        conn,
        current_user=current_user,
        days=days,
        limit=limit,
    )


@router.post("/escalations/generate-alerts")
def generate_escalation_alerts(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=1000, ge=1, le=5000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_escalation_service.create_alerts_from_escalations(
        conn,
        current_user=current_user,
        days=days,
        limit=limit,
    )


@router.get("/contextual/overview")
def contextual_overview(
    limit: int = Query(default=1000, ge=1, le=5000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_contextual_safeguarding_service.overview(
        conn,
        current_user=current_user,
        limit=limit,
    )


@router.get("/contextual/routes")
def contextual_routes(
    limit: int = Query(default=1000, ge=1, le=5000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_contextual_safeguarding_service.routes(
        conn,
        current_user=current_user,
        limit=limit,
    )


@router.get("/contextual/places")
def contextual_places(
    limit: int = Query(default=1000, ge=1, le=5000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_contextual_safeguarding_service.places(
        conn,
        current_user=current_user,
        limit=limit,
    )


@router.get("/contextual/digital")
def contextual_digital(
    limit: int = Query(default=1000, ge=1, le=5000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_contextual_safeguarding_service.digital(
        conn,
        current_user=current_user,
        limit=limit,
    )


@router.get("/contextual/vulnerabilities")
def contextual_vulnerabilities(
    limit: int = Query(default=1000, ge=1, le=5000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_contextual_safeguarding_service.vulnerabilities(
        conn,
        current_user=current_user,
        limit=limit,
    )


@router.get("/contextual/cross-boundary")
def contextual_cross_boundary(
    limit: int = Query(default=1000, ge=1, le=5000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_contextual_safeguarding_service.cross_boundary(
        conn,
        current_user=current_user,
        limit=limit,
    )


@router.get("/contextual/escalation-map")
def contextual_escalation_map(
    limit: int = Query(default=1000, ge=1, le=5000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_contextual_safeguarding_service.escalation_map(
        conn,
        current_user=current_user,
        limit=limit,
    )


@router.get("/timeline")
def timeline(
    young_person_id: int | None = Query(default=None),
    days: int | None = Query(default=None, ge=1, le=365),
    limit: int = Query(default=1000, ge=1, le=5000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_timeline_service.timeline(
        conn,
        current_user=current_user,
        young_person_id=young_person_id,
        days=days,
        limit=limit,
    )


@router.get("/timeline/grouped-by-child")
def timeline_grouped_by_child(
    limit: int = Query(default=2000, ge=1, le=10000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return isn_timeline_service.grouped_by_child(
        conn,
        current_user=current_user,
        limit=limit,
    )
