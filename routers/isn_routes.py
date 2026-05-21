from __future__ import annotations

from collections.abc import Generator
from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from schemas.isn_contracts import ISNSignalCreateRequest
from services.isn_service import isn_service

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
