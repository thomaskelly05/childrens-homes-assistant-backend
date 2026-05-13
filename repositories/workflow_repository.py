from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from psycopg2.extras import RealDictCursor

from repositories.os_repository_utils import (
    build_scope_where,
    can_write_records,
    current_user_id,
    first_col,
    isoformat,
    quote_ident,
    safe_int,
    table_columns,
    table_exists,
)


def _normalise_workflow(row: dict[str, Any]) -> dict[str, Any]:
    raw_id = str(row.get("id") or "")
    entity_type = row.get("entity_type") or row.get("record_type") or row.get("source_table") or "record"
    entity_id = row.get("entity_id") or row.get("record_id") or row.get("source_id") or raw_id
    status = row.get("status") or row.get("workflow_status") or row.get("event_type") or "recorded"
    return {
        "id": f"workflow:{raw_id}",
        "source_id": raw_id,
        "entity_type": str(entity_type),
        "entity_id": str(entity_id),
        "status": str(status),
        "label": str(row.get("label") or row.get("title") or status).replace("_", " ").title(),
        "description": row.get("description") or row.get("summary") or row.get("notes"),
        "started_at": isoformat(row.get("started_at") or row.get("created_at") or row.get("event_at")),
        "completed_at": isoformat(row.get("completed_at")),
        "owner_staff_id": str(row.get("owner_staff_id") or row.get("owner_id") or row.get("created_by") or "") or None,
        "home_id": str(row["home_id"]) if row.get("home_id") is not None else None,
        "young_person_id": str(row["young_person_id"]) if row.get("young_person_id") is not None else None,
        "metadata": row.get("metadata") or {},
    }


def list_workflows(
    conn: Any,
    *,
    current_user: dict[str, Any],
    filters: dict[str, Any] | None = None,
    limit: int = 250,
) -> list[dict[str, Any]]:
    filters = filters or {}
    table_name = "record_workflow_events"
    if not table_exists(conn, table_name):
        return []
    cols = table_columns(conn, table_name)
    select_cols = [
        col
        for col in [
            "id",
            "entity_type",
            "entity_id",
            "record_type",
            "record_id",
            "source_table",
            "source_id",
            "event_type",
            "status",
            "workflow_status",
            "label",
            "title",
            "description",
            "summary",
            "notes",
            "started_at",
            "completed_at",
            "event_at",
            "created_at",
            "owner_staff_id",
            "owner_id",
            "created_by",
            "home_id",
            "provider_id",
            "young_person_id",
            "metadata",
        ]
        if col in cols
    ]
    if "id" not in select_cols:
        return []
    where, params = build_scope_where(
        cols,
        current_user,
        home_id=filters.get("home_id"),
        young_person_id=filters.get("young_person_id"),
    )
    if filters.get("entity_type"):
        col = first_col(cols, ["entity_type", "record_type", "source_table"])
        if col:
            where.append(f"{quote_ident(col)}::text = %s")
            params.append(filters["entity_type"])
    if filters.get("entity_id"):
        col = first_col(cols, ["entity_id", "record_id", "source_id"])
        if col:
            where.append(f"{quote_ident(col)}::text = %s")
            params.append(str(filters["entity_id"]))
    order_col = first_col(cols, ["event_at", "created_at", "started_at", "id"]) or "id"
    params.append(max(1, min(int(limit or 250), 600)))
    where_sql = "WHERE " + " AND ".join(where) if where else ""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {", ".join(quote_ident(col) for col in select_cols)}
            FROM public.record_workflow_events
            {where_sql}
            ORDER BY {quote_ident(order_col)} DESC NULLS LAST
            LIMIT %s
            """,
            tuple(params),
        )
        rows = [dict(row) for row in (cur.fetchall() or [])]
    return [_normalise_workflow(row) for row in rows]


def get_workflow(conn: Any, *, workflow_id: str, current_user: dict[str, Any]) -> dict[str, Any] | None:
    for workflow in list_workflows(conn, current_user=current_user, limit=600):
        if workflow["id"] == workflow_id or workflow["source_id"] == workflow_id:
            return workflow
    return None


def create_workflow_event(conn: Any, *, workflow_id: str, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
    if not can_write_records(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to update workflows.")
    if not table_exists(conn, "record_workflow_events"):
        raise HTTPException(status_code=400, detail="Workflow event storage is not available in this schema.")
    cols = table_columns(conn, "record_workflow_events")
    event: dict[str, Any] = {}
    for column, value in {
        "entity_type": payload.get("entity_type"),
        "entity_id": payload.get("entity_id") or workflow_id,
        "record_type": payload.get("entity_type"),
        "record_id": payload.get("entity_id") or workflow_id,
        "event_type": payload.get("event_type") or payload.get("status") or "workflow_event",
        "status": payload.get("status"),
        "label": payload.get("label"),
        "description": payload.get("description"),
        "summary": payload.get("description"),
        "notes": payload.get("notes"),
        "home_id": safe_int(payload.get("home_id")),
        "young_person_id": safe_int(payload.get("young_person_id")),
        "created_by": current_user_id(current_user),
        "event_at": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc),
        "metadata": payload.get("metadata") or {},
    }.items():
        if column in cols and value is not None:
            event[column] = value
    if not event:
        raise HTTPException(status_code=400, detail="No compatible workflow event fields are available.")
    columns = list(event)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            INSERT INTO public.record_workflow_events ({", ".join(quote_ident(col) for col in columns)})
            VALUES ({", ".join(["%s"] * len(columns))})
            RETURNING *
            """,
            tuple(event[col] for col in columns),
        )
        row = cur.fetchone()
    return _normalise_workflow(dict(row))

