from __future__ import annotations

from collections.abc import Generator
from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from services.chronology_projection_service import chronology_projection_service
from services.event_reconciliation_service import event_reconciliation_service
from services.evidence_graph_service import evidence_graph_service
from services.operational_memory_replay_service import operational_memory_replay_service
from services.operational_memory_service import OperationalMemoryService
from services.provider_operational_queue_service import provider_operational_queue_service

router = APIRouter(prefix="/api/operational-memory", tags=["operational-memory"])
compat_router = APIRouter(prefix="/operational-memory", tags=["operational-memory-compat"])
service = OperationalMemoryService()


def _db() -> Generator[Any, None, None]:
    from db.connection import get_db

    yield from get_db()


@router.get("/children/{young_person_id}")
@compat_router.get("/children/{young_person_id}")
def child_memory(
    young_person_id: int,
    days: int = Query(default=5, ge=1, le=31),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.child_memory(
        young_person_id=young_person_id,
        current_user=current_user,
        days=days,
    )


@router.get("/children/{young_person_id}/summary")
@compat_router.get("/children/{young_person_id}/summary")
def child_memory_summary(
    young_person_id: int,
    days: int = Query(default=5, ge=1, le=31),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    result = service.child_memory(
        young_person_id=young_person_id,
        current_user=current_user,
        days=days,
    )
    if not result.get("ok"):
        return result
    return {
        "ok": True,
        "young_person_id": young_person_id,
        "days": days,
        "summary": result.get("summary"),
        "metrics": result.get("metrics"),
        "emotional_state": result.get("emotional_state"),
        "risk_state": result.get("risk_state"),
        "next_actions": result.get("next_actions"),
    }


@router.get("/replay")
def replay_operational_memory(
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    child_id: int | None = Query(default=None),
    staff_id: int | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    after_cursor: int | None = Query(default=None),
    since: str | None = Query(default=None),
    replay_at: str | None = Query(default=None),
    correlation_id: str | None = Query(default=None),
    export: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=1000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    result = operational_memory_replay_service.replay(
        conn,
        current_user=current_user,
        provider_id=provider_id,
        home_id=home_id,
        child_id=child_id,
        staff_id=staff_id,
        entity_type=entity_type,
        entity_id=entity_id,
        after_cursor=after_cursor,
        since=since,
        replay_at=replay_at,
        correlation_id=correlation_id,
        export=export,
        limit=limit,
    )
    return result.model_dump(mode="json")


@router.get("/entity-history")
def entity_history(
    entity_type: str = Query(...),
    entity_id: str = Query(...),
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    result = operational_memory_replay_service.entity_history(
        conn,
        current_user=current_user,
        provider_id=provider_id,
        home_id=home_id,
        entity_type=entity_type,
        entity_id=entity_id,
        limit=limit,
    )
    return result.model_dump(mode="json")


@router.get("/chronology")
def chronology_projection(
    projection_type: str = Query(default="operational"),
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    child_id: int | None = Query(default=None),
    staff_id: int | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return chronology_projection_service.project(
        conn,
        current_user=current_user,
        projection_type=projection_type,
        provider_id=provider_id,
        home_id=home_id,
        child_id=child_id,
        staff_id=staff_id,
        entity_type=entity_type,
        entity_id=entity_id,
        limit=limit,
    )


@router.get("/governance")
def governance_memory(
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    result = operational_memory_replay_service.replay(
        conn,
        current_user=current_user,
        provider_id=provider_id,
        home_id=home_id,
        entity_type=entity_type,
        entity_id=entity_id,
        tables=("governance_signoff_history", "operational_audit_timeline"),
        limit=limit,
        permission="governance:review",
    )
    return result.model_dump(mode="json")


@router.get("/evidence")
def evidence_traversal(
    entity_type: str = Query(...),
    entity_id: str = Query(...),
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    traversal = evidence_graph_service.traverse(
        conn,
        current_user=current_user,
        entity_type=entity_type,
        entity_id=entity_id,
        provider_id=provider_id,
        home_id=home_id,
        limit=limit,
    )
    return traversal.model_dump(mode="json")


@router.get("/provider-queues")
def provider_queues(
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=1000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return provider_operational_queue_service.overview(
        conn,
        current_user=current_user,
        provider_id=provider_id,
        home_id=home_id,
        limit=limit,
    )


@router.get("/reconciliation")
def reconciliation(
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    limit: int = Query(default=1000, ge=1, le=2000),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    report = event_reconciliation_service.reconcile(
        conn,
        current_user=current_user,
        provider_id=provider_id,
        home_id=home_id,
        limit=limit,
    )
    return report.model_dump(mode="json")
