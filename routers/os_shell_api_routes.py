from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends
from psycopg2.errors import UndefinedTable

from auth.current_user import get_current_user
from db.connection import get_db
from services import young_people_service as yp
from services.workspace_records_service import RECORD_TABLES, WorkspaceRecordsService

router = APIRouter(prefix="/api", tags=["OS Shell API"])
records_service = WorkspaceRecordsService()


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, "", "null", "None"):
            return None
        parsed = int(value)
        return parsed if parsed > 0 else None
    except Exception:
        return None


def _home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))


def _provider_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("provider_id") or current_user.get("providerId"))


def _name_from_person(row: dict[str, Any]) -> str:
    return (
        row.get("preferred_name")
        or " ".join([str(row.get("first_name") or "").strip(), str(row.get("last_name") or "").strip()]).strip()
        or row.get("name")
        or "Young person"
    )


def _normalise_child(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "young_person_id": row.get("id"),
        "name": _name_from_person(row),
        "first_name": row.get("first_name"),
        "last_name": row.get("last_name"),
        "preferred_name": row.get("preferred_name"),
        "date_of_birth": row.get("date_of_birth"),
        "age": row.get("age"),
        "home_id": row.get("home_id"),
        "provider_id": row.get("provider_id"),
        "placement_status": row.get("placement_status"),
        "status": row.get("placement_status") or "active",
        "risk": row.get("summary_risk_level") or row.get("risk_level"),
        "photo_url": row.get("photo_url"),
        "key_worker_id": row.get("primary_keyworker_id"),
        "admission_date": row.get("admission_date"),
    }


def _table_exists(conn: Any, table: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists",
            (table,),
        )
        row = cur.fetchone()
        return bool(row.get("exists") if isinstance(row, dict) else row and row[0])


def _first_existing_table(conn: Any, names: list[str]) -> str | None:
    for table in names:
        if _table_exists(conn, table):
            return table
    return None


def _columns(conn: Any, table: str) -> set[str]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s",
            (table,),
        )
        return {str(row["column_name"] if isinstance(row, dict) else row[0]) for row in cur.fetchall()}


def _normalise_record(row: dict[str, Any], record_type: str) -> dict[str, Any]:
    content = row.get("content") or {}
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except Exception:
            content = {"text": content}
    if not isinstance(content, dict):
        content = {}
    status = row.get("status") or row.get("workflow_status") or row.get("manager_review_status") or row.get("approval_status")
    return {
        "id": row.get("id"),
        "record_type": record_type,
        "type": record_type,
        "title": row.get("title") or row.get("topic") or row.get("incident_type") or record_type.replace("_", " ").title(),
        "summary": row.get("summary") or row.get("summary_text") or row.get("body") or row.get("description") or row.get("notes") or row.get("actions_taken") or row.get("purpose") or row.get("reflective_analysis") or content.get("what_happened"),
        "status": status,
        "workflow_status": row.get("workflow_status") or status,
        "mood": row.get("mood"),
        "severity": row.get("severity") or row.get("significance") or row.get("priority"),
        "young_person_id": row.get("young_person_id"),
        "home_id": row.get("home_id"),
        "provider_id": row.get("provider_id"),
        "created_by": row.get("created_by") or row.get("author_id") or row.get("worker_id") or row.get("staff_id") or row.get("generated_by"),
        "reviewed_by": row.get("reviewed_by") or row.get("approved_by"),
        "reviewed_at": row.get("reviewed_at") or row.get("approved_at"),
        "manager_comment": row.get("manager_comment") or row.get("manager_review_comment") or row.get("review_comment"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at") or row.get("last_edited_at"),
        "occurred_at": row.get("incident_datetime") or row.get("start_datetime") or row.get("session_date") or row.get("handover_date") or row.get("meeting_date"),
        "content": content or {k: v for k, v in row.items() if k not in {"id", "created_at", "updated_at"}},
    }


def _list_record_items(
    conn: Any,
    record_types: list[str],
    current_user: dict[str, Any],
    *,
    limit: int = 50,
    young_person_id: int | None = None,
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    home_id = _home_id(current_user)
    provider_id = _provider_id(current_user)

    for record_type in record_types:
        table = _first_existing_table(conn, RECORD_TABLES.get(record_type, []))
        if not table:
            continue
        cols = _columns(conn, table)
        select_cols = records_service._select_cols(cols)
        if not select_cols:
            continue

        where: list[str] = []
        params: list[Any] = []
        if young_person_id and "young_person_id" in cols:
            where.append("young_person_id = %s")
            params.append(young_person_id)
        if home_id and "home_id" in cols:
            where.append("home_id = %s")
            params.append(home_id)
        elif provider_id and "provider_id" in cols:
            where.append("provider_id = %s")
            params.append(provider_id)
        if "archived" in cols:
            where.append("COALESCE(archived, false) = false")
        status_col = next((col for col in ("status", "workflow_status", "manager_review_status", "approval_status") if col in cols), None)
        if status_col:
            where.append(f"COALESCE(\"{status_col}\", '') <> 'archived'")

        order_col = next((col for col in ("updated_at", "last_edited_at", "created_at", "id") if col in cols), "id")
        where_sql = "WHERE " + " AND ".join(where) if where else ""
        quoted_cols = ", ".join([f'"{col}"' for col in select_cols])
        params.append(max(1, min(int(limit or 50), 250)))
        with conn.cursor() as cur:
            cur.execute(
                f'SELECT {quoted_cols} FROM public."{table}" {where_sql} ORDER BY "{order_col}" DESC NULLS LAST LIMIT %s',
                tuple(params),
            )
            rows = cur.fetchall() or []
        for row in rows:
            items.append(_normalise_record(dict(row), record_type))

    items.sort(key=lambda item: str(item.get("updated_at") or item.get("created_at") or ""), reverse=True)
    return items[:limit]


def _list_children(conn: Any, current_user: dict[str, Any], *, limit: int = 250) -> list[dict[str, Any]]:
    if not _table_exists(conn, "young_people"):
        return []
    try:
        rows = yp.list_young_people(
            conn,
            home_id=_home_id(current_user),
            provider_id=_provider_id(current_user),
            include_archived=False,
            search="",
            sort_by="last_name",
            sort_dir="asc",
            limit=limit,
            offset=0,
        )
    except UndefinedTable:
        try:
            conn.rollback()
        except Exception:
            pass
        return []
    return [_normalise_child(dict(row)) for row in rows]


def _list_chronology(conn: Any, children: list[dict[str, Any]], *, limit: int = 200) -> list[dict[str, Any]]:
    child_ids = [child.get("id") for child in children if _safe_int(child.get("id"))]
    if not child_ids or not _table_exists(conn, "chronology_events"):
        return []
    child_name = {_safe_int(child.get("id")): child.get("name") for child in children}
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                young_person_id,
                event_datetime AS occurred_at,
                title,
                summary,
                category,
                subcategory,
                significance,
                created_at
            FROM chronology_events
            WHERE young_person_id = ANY(%s)
              AND COALESCE(is_visible, TRUE) = TRUE
            ORDER BY event_datetime DESC, created_at DESC, id DESC
            LIMIT %s
            """,
            (child_ids, max(1, min(int(limit or 200), 500))),
        )
        rows = cur.fetchall() or []
    entries: list[dict[str, Any]] = []
    for row in rows:
        row = dict(row)
        child_id = _safe_int(row.get("young_person_id"))
        entries.append(
            {
                "id": row.get("id"),
                "young_person_id": child_id,
                "child_name": child_name.get(child_id),
                "title": row.get("title") or row.get("category") or "Activity",
                "summary": row.get("summary") or "Recent activity",
                "narrative": row.get("summary") or "Recent activity",
                "event_type": row.get("category"),
                "subcategory": row.get("subcategory"),
                "occurred_at": row.get("occurred_at") or row.get("created_at"),
                "workflow_status": "recorded",
                "severity": row.get("significance"),
            }
        )
    return entries


def _active_alerts(conn: Any, children: list[dict[str, Any]]) -> list[dict[str, Any]]:
    child_ids = [child.get("id") for child in children if _safe_int(child.get("id"))]
    if not child_ids:
        return []
    table = _first_existing_table(conn, ["young_person_alerts", "alerts", "risk_alerts"])
    if not table:
        return []
    cols = _columns(conn, table)
    if "young_person_id" not in cols:
        return []
    child_name = {_safe_int(child.get("id")): child.get("name") for child in children}
    select_cols = [col for col in ["id", "young_person_id", "title", "summary", "description", "alert_type", "severity", "priority", "status", "is_active", "created_at", "updated_at"] if col in cols]
    if not select_cols:
        return []
    where = ["young_person_id = ANY(%s)"]
    params: list[Any] = [child_ids]
    if "is_active" in cols:
        where.append("COALESCE(is_active, true) = true")
    if "status" in cols:
        where.append("COALESCE(status, 'active') <> 'archived'")
    # Build quoted identifiers / WHERE clause without a backslash inside an f-string
    # expression (illegal on Python 3.11, the pinned runtime). Output is unchanged.
    select_sql = ", ".join('"' + col + '"' for col in select_cols)
    where_sql = " AND ".join(where)
    with conn.cursor() as cur:
        cur.execute(
            f'SELECT {select_sql} FROM public."{table}" WHERE {where_sql} ORDER BY COALESCE(updated_at, created_at) DESC NULLS LAST LIMIT 100',
            tuple(params),
        )
        rows = cur.fetchall() or []
    alerts: list[dict[str, Any]] = []
    for row in rows:
        row = dict(row)
        child_id = _safe_int(row.get("young_person_id"))
        row["child_name"] = child_name.get(child_id)
        row["type"] = row.get("alert_type") or "alert"
        row["summary"] = row.get("summary") or row.get("description") or row.get("title") or "Active alert"
        alerts.append(row)
    return alerts


@router.get("/children")
def api_children(current_user: dict[str, Any] = Depends(get_current_user), conn=Depends(get_db)):
    items = _list_children(conn, current_user)
    return {"ok": True, "items": items, "children": items, "count": len(items)}


@router.get("/young-people")
def api_young_people(current_user: dict[str, Any] = Depends(get_current_user), conn=Depends(get_db)):
    return api_children(current_user=current_user, conn=conn)


@router.get("/documents")
def api_documents(current_user: dict[str, Any] = Depends(get_current_user), conn=Depends(get_db)):
    items = _list_record_items(conn, ["daily", "incident", "safeguarding", "missing"], current_user, limit=100)
    return {"ok": True, "items": items, "documents": items, "count": len(items)}


@router.get("/records")
def api_records(current_user: dict[str, Any] = Depends(get_current_user), conn=Depends(get_db)):
    return api_documents(current_user=current_user, conn=conn)


@router.get("/chronology")
def api_chronology(current_user: dict[str, Any] = Depends(get_current_user), conn=Depends(get_db)):
    children = _list_children(conn, current_user, limit=250)
    entries = _list_chronology(conn, children, limit=250)
    return {"ok": True, "items": entries, "chronology": entries, "count": len(entries)}


@router.get("/safeguarding")
def api_safeguarding(current_user: dict[str, Any] = Depends(get_current_user), conn=Depends(get_db)):
    children = _list_children(conn, current_user, limit=250)
    records = _list_record_items(conn, ["safeguarding", "incident", "missing"], current_user, limit=100)
    alerts = _active_alerts(conn, children)
    items = alerts + records
    return {"ok": True, "items": items, "safeguarding": items, "count": len(items)}


@router.get("/homes")
def api_homes(current_user: dict[str, Any] = Depends(get_current_user)):
    home_id = _home_id(current_user)
    item = {
        "id": home_id,
        "name": current_user.get("home_name") or current_user.get("selected_home_name") or "Current home",
        "provider_id": _provider_id(current_user),
        "status": "active",
    }
    return {"ok": True, "items": [item] if home_id else [], "homes": [item] if home_id else [], "count": 1 if home_id else 0}


@router.get("/workforce")
def api_workforce(current_user: dict[str, Any] = Depends(get_current_user)):
    item = {
        "id": current_user.get("id") or current_user.get("user_id"),
        "name": current_user.get("name") or current_user.get("email") or "Current user",
        "email": current_user.get("email"),
        "role": current_user.get("role"),
        "home_id": _home_id(current_user),
        "status": "active",
    }
    return {"ok": True, "items": [item], "workforce": [item], "count": 1}


@router.get("/os/context")
def api_os_context(current_user: dict[str, Any] = Depends(get_current_user), conn=Depends(get_db)):
    children = _list_children(conn, current_user, limit=250)
    documents = _list_record_items(conn, ["daily", "incident", "safeguarding", "missing"], current_user, limit=100)
    chronology = _list_chronology(conn, children, limit=250)
    safeguarding = _active_alerts(conn, children) + _list_record_items(conn, ["safeguarding", "incident", "missing"], current_user, limit=100)
    homes = api_homes(current_user=current_user).get("items") or []
    workforce = api_workforce(current_user=current_user).get("items") or []
    return {
        "ok": True,
        "children": children,
        "documents": documents,
        "chronology": chronology,
        "safeguarding": safeguarding,
        "homes": homes,
        "workforce": workforce,
    }
