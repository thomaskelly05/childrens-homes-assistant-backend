from __future__ import annotations

from collections.abc import Generator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from schemas.safeguarding_contracts import SafeguardingActionRequest, SafeguardingCreateRequest, SafeguardingTransitionRequest
from services.chronology_projection_service import chronology_projection_service
from services.operational_synthesis_service import operational_synthesis_service
from services.safeguarding_domain_service import safeguarding_domain_service

router = APIRouter(prefix="/api/safeguarding/domain", tags=["safeguarding-domain"])


def _db() -> Generator[Any, None, None]:
    from db.connection import get_db

    yield from get_db()


@router.post("")
def create_safeguarding(
    payload: SafeguardingCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    record = safeguarding_domain_service.create(conn, payload=payload, current_user=current_user)
    return {"ok": True, "item": record.model_dump(mode="json")}


@router.get("")
def list_safeguarding(
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    lifecycle_state: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    result = safeguarding_domain_service.list(
        conn,
        current_user=current_user,
        home_id=home_id,
        young_person_id=young_person_id,
        lifecycle_state=lifecycle_state,
        limit=limit,
    )
    return result.model_dump(mode="json")


@router.get("/queues")
def safeguarding_queues(
    home_id: int | None = Query(default=None),
    limit: int = Query(default=300, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return safeguarding_domain_service.queues(conn, current_user=current_user, home_id=home_id, limit=limit).model_dump(mode="json")


@router.get("/synthesis")
def safeguarding_synthesis(
    home_id: int | None = Query(default=None),
    limit: int = Query(default=300, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    records = safeguarding_domain_service.list(conn, current_user=current_user, home_id=home_id, limit=limit).items
    return {"ok": True, **operational_synthesis_service.safeguarding_patterns(records)}


@router.get("/{safeguarding_id}")
def get_safeguarding(
    safeguarding_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    record = safeguarding_domain_service.get(conn, safeguarding_id=safeguarding_id, current_user=current_user)
    if record is None:
        raise HTTPException(status_code=404, detail="Safeguarding record not found.")
    return {"ok": True, "item": record.model_dump(mode="json")}


@router.get("/{safeguarding_id}/chronology")
def safeguarding_chronology(
    safeguarding_id: str,
    limit: int = Query(default=100, ge=1, le=300),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return chronology_projection_service.project(
        conn,
        current_user=current_user,
        projection_type="safeguarding",
        entity_type="safeguarding",
        entity_id=safeguarding_id,
        limit=limit,
    )


@router.post("/{safeguarding_id}/review")
def review_safeguarding(
    safeguarding_id: str,
    payload: SafeguardingTransitionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    record = safeguarding_domain_service.review(conn, safeguarding_id=safeguarding_id, payload=payload, current_user=current_user)
    return {"ok": True, "item": record.model_dump(mode="json")}


@router.post("/{safeguarding_id}/actions")
def add_safeguarding_action(
    safeguarding_id: str,
    payload: SafeguardingActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    record = safeguarding_domain_service.add_action(conn, safeguarding_id=safeguarding_id, payload=payload, current_user=current_user)
    return {"ok": True, "item": record.model_dump(mode="json")}


@router.post("/{safeguarding_id}/escalate")
def escalate_safeguarding(
    safeguarding_id: str,
    payload: SafeguardingTransitionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    record = safeguarding_domain_service.escalate(conn, safeguarding_id=safeguarding_id, payload=payload, current_user=current_user)
    return {"ok": True, "item": record.model_dump(mode="json")}


@router.post("/{safeguarding_id}/resolve")
def resolve_safeguarding(
    safeguarding_id: str,
    payload: SafeguardingTransitionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    record = safeguarding_domain_service.resolve(conn, safeguarding_id=safeguarding_id, payload=payload, current_user=current_user)
    return {"ok": True, "item": record.model_dump(mode="json")}
