from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.current_user import get_current_user
from db.connection import get_db
from services.inspection_intelligence_service import inspection_intelligence_service
from services.manager_operational_queue_service import manager_operational_queue_service
from services.operational_event_intelligence_service import operational_event_intelligence_service
from services.operational_projection_engine import operational_projection_engine
from services.orb_operational_memory_service import orb_operational_memory_service

router = APIRouter(prefix="/os/operational-feed", tags=["Operational Feed"])
compat_router = APIRouter(prefix="/api/os-command", tags=["Operational Feed Compatibility"])

SOURCE_TABLES = [
    "daily_notes",
    "incidents",
    "missing_episodes",
    "education_records",
    "health_records",
    "family_contact_records",
    "keywork_sessions",
]


def _table_exists(cur: Any, table: str) -> bool:
    cur.execute(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=%s)",
        (table,),
    )
    return bool(cur.fetchone()[0])


def _columns(cur: Any, table: str) -> set[str]:
    cur.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s",
        (table,),
    )
    return {str(row[0]) for row in cur.fetchall() or []}


def _latest_records(cur: Any, table: str, limit: int, young_person_id: int | None) -> list[dict[str, Any]]:
    if not _table_exists(cur, table):
        return []

    cols = _columns(cur, table)

    order_column = next(
        (
            column
            for column in [
                "updated_at",
                "created_at",
                "incident_datetime",
                "note_date",
                "start_datetime",
                "record_date",
                "event_datetime",
                "contact_datetime",
                "session_date",
            ]
            if column in cols
        ),
        "id",
    )

    where = ""
    params: list[Any] = []
    if young_person_id is not None and "young_person_id" in cols:
        where = "WHERE young_person_id = %s"
        params.append(young_person_id)

    params.append(limit)

    cur.execute(
        f"SELECT * FROM public.\"{table}\" {where} ORDER BY \"{order_column}\" DESC NULLS LAST LIMIT %s",
        tuple(params),
    )

    rows = cur.fetchall() or []
    keys = [desc[0] for desc in cur.description]
    return [dict(zip(keys, row)) for row in rows]


def _build_feed(conn: Any, *, young_person_id: int | None = None, limit: int = 50) -> dict[str, Any]:
    events: list[dict[str, Any]] = []

    with conn.cursor() as cur:
        for table in SOURCE_TABLES:
            records = _latest_records(cur, table, limit=max(1, limit // len(SOURCE_TABLES)), young_person_id=young_person_id)
            for record in records:
                event = operational_event_intelligence_service.build_event(
                    source_table=table,
                    record=record,
                ).model_dump()
                events.append(event)

    events = sorted(events, key=lambda item: str(item.get("event_at") or ""), reverse=True)
    events = events[:limit]

    manager_queue = manager_operational_queue_service.build_from_events(events)
    inspection = inspection_intelligence_service.analyse(
        events=events,
        manager_queue=manager_queue,
    )
    projection = operational_projection_engine.project(
        events,
        subject_type="young_person" if young_person_id else "home",
        subject_id=str(young_person_id) if young_person_id else None,
    ).model_dump()
    orb_memory = orb_operational_memory_service.build_memory(
        events,
        young_person_id=young_person_id,
    )

    return {
        "ok": True,
        "event_count": len(events),
        "young_person_id": young_person_id,
        "events": events,
        "manager_queue": manager_queue,
        "inspection_intelligence": inspection,
        "projection": projection,
        "orb_operational_memory": orb_memory,
    }


@router.get("")
def operational_feed(
    young_person_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return _build_feed(conn, young_person_id=young_person_id, limit=limit)


@compat_router.get("/operational-feed")
def operational_feed_compat(
    young_person_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return _build_feed(conn, young_person_id=young_person_id, limit=limit)
