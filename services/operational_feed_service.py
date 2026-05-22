from __future__ import annotations

from typing import Any

from services.home_operational_intelligence_service import home_operational_intelligence_service
from services.inspection_intelligence_service import inspection_intelligence_service
from services.manager_operational_queue_service import manager_operational_queue_service
from services.operational_event_intelligence_service import operational_event_intelligence_service
from services.operational_projection_engine import operational_projection_engine
from services.orb_operational_memory_service import orb_operational_memory_service

SOURCE_TABLES = [
    "daily_notes",
    "incidents",
    "missing_episodes",
    "education_records",
    "health_records",
    "family_contact_records",
    "keywork_sessions",
]


def table_exists(cur: Any, table: str) -> bool:
    cur.execute(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=%s)",
        (table,),
    )
    row = cur.fetchone()
    if not row:
        return False
    if isinstance(row, dict):
        return bool(row.get("exists"))
    return bool(row[0])


def table_columns(cur: Any, table: str) -> set[str]:
    cur.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s",
        (table,),
    )
    return {
        str(row.get("column_name") if isinstance(row, dict) else row[0])
        for row in cur.fetchall() or []
    }


def latest_records(
    cur: Any,
    table: str,
    limit: int,
    *,
    young_person_id: int | None = None,
    home_id: int | None = None,
) -> list[dict[str, Any]]:
    if not table_exists(cur, table):
        return []

    cols = table_columns(cur, table)
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

    where_parts: list[str] = []
    params: list[Any] = []
    if young_person_id is not None and "young_person_id" in cols:
        where_parts.append("young_person_id = %s")
        params.append(young_person_id)
    if home_id is not None and "home_id" in cols:
        where_parts.append("home_id = %s")
        params.append(home_id)

    where = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""
    params.append(limit)

    cur.execute(
        f'SELECT * FROM public."{table}" {where} ORDER BY "{order_column}" DESC NULLS LAST LIMIT %s',
        tuple(params),
    )

    rows = cur.fetchall() or []
    if not rows:
        return []
    if isinstance(rows[0], dict):
        return [dict(row) for row in rows]
    keys = [desc[0] for desc in cur.description]
    return [dict(zip(keys, row)) for row in rows]


def build_events_from_conn(
    conn: Any,
    *,
    young_person_id: int | None = None,
    home_id: int | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    per_table = max(1, limit // len(SOURCE_TABLES))

    with conn.cursor() as cur:
        for table in SOURCE_TABLES:
            records = latest_records(
                cur,
                table,
                limit=per_table,
                young_person_id=young_person_id,
                home_id=home_id,
            )
            for record in records:
                events.append(
                    operational_event_intelligence_service.build_event(
                        source_table=table,
                        record=record,
                    ).model_dump()
                )

    events.sort(key=lambda item: str(item.get("event_at") or ""), reverse=True)
    return events[:limit]


def build_operational_feed(
    conn: Any,
    *,
    young_person_id: int | None = None,
    home_id: int | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    events = build_events_from_conn(
        conn,
        young_person_id=young_person_id,
        home_id=home_id,
        limit=limit,
    )

    manager_queue = manager_operational_queue_service.build_from_events(events)
    inspection = inspection_intelligence_service.analyse(events=events, manager_queue=manager_queue)
    projection = operational_projection_engine.project(
        events,
        subject_type="young_person" if young_person_id else "home",
        subject_id=str(young_person_id) if young_person_id else (str(home_id) if home_id else None),
    ).model_dump()
    orb_memory = orb_operational_memory_service.build_memory(events, young_person_id=young_person_id)
    home_intelligence = home_operational_intelligence_service.analyse(
        events=events,
        manager_queue=manager_queue,
        inspection=inspection,
    )

    return {
        "ok": True,
        "event_count": len(events),
        "young_person_id": young_person_id,
        "home_id": home_id,
        "events": events,
        "manager_queue": manager_queue,
        "inspection_intelligence": inspection,
        "projection": projection,
        "orb_operational_memory": orb_memory,
        "home_operational_intelligence": home_intelligence,
    }
