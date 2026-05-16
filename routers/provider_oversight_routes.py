from __future__ import annotations

from collections.abc import Generator
from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from services.provider_oversight_service import provider_oversight_service
from services.provider_operational_queue_service import provider_operational_queue_service

router = APIRouter(prefix="/api/provider", tags=["provider-oversight"])


def _db() -> Generator[Any, None, None]:
    from db.connection import get_db

    yield from get_db()


@router.get("/oversight")
def provider_oversight(
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return provider_operational_queue_service.overview(
        conn,
        current_user=current_user,
        provider_id=provider_id,
        home_id=home_id,
    )


@router.get("/governance")
def provider_governance(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return provider_oversight_service.category(current_user=current_user, category="unsigned_governance_actions")


@router.get("/inspection")
def provider_inspection(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return provider_oversight_service.category(current_user=current_user, category="inspection_gaps")


@router.get("/risk")
def provider_risk(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return provider_oversight_service.risk_summary(current_user=current_user)


@router.get("/operational-queues")
def provider_operational_queues(
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return provider_operational_queue_service.overview(
        conn,
        current_user=current_user,
        provider_id=provider_id,
        home_id=home_id,
    )["queues"]
