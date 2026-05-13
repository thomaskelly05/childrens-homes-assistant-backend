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
    is_manager,
    normalise_priority,
    normalise_status,
    quote_ident,
    safe_int,
    table_columns,
    table_exists,
)


ACTION_TABLES = [
    {
        "table": "tasks",
        "source_type": "task",
        "title": ["title", "task"],
        "summary": ["task", "summary", "description"],
        "owner": ["assigned_to_user_id", "staff_id", "owner_id"],
        "due": ["due_date", "due_at", "target_date"],
    },
    {
        "table": "manager_actions",
        "source_type": "manager_action",
        "title": ["title", "action_title", "action"],
        "summary": ["summary", "description", "action_description", "notes"],
        "owner": ["owner_id", "assigned_to_user_id", "staff_id"],
        "due": ["due_date", "due_at", "target_date"],
    },
    {
        "table": "monthly_review_actions",
        "source_type": "monthly_review_action",
        "title": ["title", "action_title", "action"],
        "summary": ["summary", "description", "action_description", "notes"],
        "owner": ["owner_id", "assigned_to_user_id", "staff_id"],
        "due": ["due_date", "due_at", "target_date"],
    },
    {
        "table": "inspection_improvement_actions",
        "source_type": "inspection_improvement_action",
        "title": ["title", "action_title", "action"],
        "summary": ["summary", "description", "action_description", "notes"],
        "owner": ["owner_user_id", "owner_id", "assigned_to_user_id", "staff_id"],
        "due": ["due_date", "action_due_date", "due_at", "target_date"],
    },
    {
        "table": "reg44_report_actions",
        "source_type": "reg44_report_action",
        "title": ["title", "action_title", "action"],
        "summary": ["summary", "description", "action_description", "recommendation"],
        "owner": ["owner_user_id", "owner_id", "assigned_to_user_id", "staff_id"],
        "due": ["due_date", "due_at", "target_date"],
    },
]


def _first_value(row: dict[str, Any], columns: list[str], default: Any = None) -> Any:
    for col in columns:
        if row.get(col) not in (None, ""):
            return row.get(col)
    return default


def _normalise_action(row: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    source_type = config["source_type"]
    raw_id = str(row.get("id") or "")
    due_date = _first_value(row, config["due"])
    status = normalise_status(row.get("status") or row.get("workflow_status") or row.get("completed_status"))
    if due_date and status not in {"completed", "overdue"}:
        try:
            due = due_date.date() if hasattr(due_date, "date") else datetime.fromisoformat(str(due_date).replace("Z", "+00:00")).date()
            if due < datetime.now(timezone.utc).date():
                status = "overdue"
        except Exception:
            pass
    source_table = row.get("source_table") or row.get("source_type") or config["table"]
    source_id = row.get("source_id") or row.get("record_id") or row.get("line_of_enquiry_id") or raw_id
    priority = normalise_priority(row.get("priority") or row.get("severity") or row.get("impact"))
    owner = _first_value(row, config["owner"])

    return {
        "id": f"{source_type}:{raw_id}",
        "source_type": source_type,
        "source_id": str(source_id) if source_id is not None else raw_id,
        "source_table": str(source_table) if source_table is not None else config["table"],
        "original_table": config["table"],
        "original_id": raw_id,
        "title": str(_first_value(row, config["title"], "Action")),
        "description": str(_first_value(row, config["summary"], "")),
        "summary": str(_first_value(row, config["summary"], "")),
        "status": status,
        "priority": priority,
        "due_date": due_date.isoformat() if hasattr(due_date, "isoformat") else due_date,
        "assigned_to_staff_id": str(owner) if owner is not None else "",
        "assigned_role": row.get("assigned_role") or "",
        "young_person_id": str(row["young_person_id"]) if row.get("young_person_id") is not None else None,
        "home_id": str(row["home_id"]) if row.get("home_id") is not None else None,
        "regulation": row.get("regulation") or row.get("regulation_ref") or row.get("sccif_area"),
        "evidence_required": row.get("evidence_required") or row.get("evidence_requirements") or [],
        "evidence_ids": row.get("evidence_ids") or [],
        "created_at": row.get("created_at").isoformat() if hasattr(row.get("created_at"), "isoformat") else row.get("created_at"),
        "updated_at": row.get("updated_at").isoformat() if hasattr(row.get("updated_at"), "isoformat") else row.get("updated_at"),
        "completed_at": row.get("completed_at").isoformat() if hasattr(row.get("completed_at"), "isoformat") else row.get("completed_at"),
    }


def list_actions(
    conn: Any,
    *,
    current_user: dict[str, Any],
    filters: dict[str, Any] | None = None,
    limit: int = 250,
) -> list[dict[str, Any]]:
    filters = filters or {}
    limit = max(1, min(int(limit or 250), 600))
    actions: list[dict[str, Any]] = []

    for config in ACTION_TABLES:
        table_name = config["table"]
        if not table_exists(conn, table_name):
            continue
        cols = table_columns(conn, table_name)
        if "id" not in cols:
            continue

        select_cols = ["id"]
        for candidates in (config["title"], config["summary"], config["owner"], config["due"]):
            select_cols.extend([col for col in candidates if col in cols])
        select_cols.extend(
            [
                col
                for col in [
                    "status",
                    "workflow_status",
                    "completed_status",
                    "priority",
                    "severity",
                    "impact",
                    "home_id",
                    "provider_id",
                    "young_person_id",
                    "source_table",
                    "source_type",
                    "source_id",
                    "record_id",
                    "line_of_enquiry_id",
                    "assigned_role",
                    "regulation",
                    "regulation_ref",
                    "sccif_area",
                    "evidence_required",
                    "evidence_requirements",
                    "evidence_ids",
                    "completed_at",
                    "created_at",
                    "updated_at",
                ]
                if col in cols
            ]
        )
        select_cols = sorted(set(select_cols), key=select_cols.index)

        where, params = build_scope_where(
            cols,
            current_user,
            home_id=filters.get("home_id"),
            young_person_id=filters.get("young_person_id"),
            staff_id=filters.get("owner_user_id"),
        )
        if filters.get("source_type") and table_name != filters["source_type"] and config["source_type"] != filters["source_type"]:
            if "source_table" in cols:
                where.append("LOWER(COALESCE(source_table, '')) = %s")
                params.append(str(filters["source_type"]).lower())
            else:
                where.append("1=0")
        if filters.get("source_id") and "source_id" in cols:
            where.append("source_id = %s")
            params.append(filters["source_id"])

        order_col = first_col(cols, ["due_date", "due_at", "target_date", "updated_at", "created_at", "id"]) or "id"
        params.append(limit)
        where_sql = "WHERE " + " AND ".join(where) if where else ""
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT {", ".join(quote_ident(col) for col in select_cols)}
                FROM public.{quote_ident(table_name)}
                {where_sql}
                ORDER BY {quote_ident(order_col)} ASC NULLS LAST, id DESC
                LIMIT %s
                """,
                tuple(params),
            )
            rows = [dict(row) for row in (cur.fetchall() or [])]
        actions.extend(_normalise_action(row, config) for row in rows)

    status_filter = str(filters.get("status") or "").strip().lower()
    if status_filter:
        actions = [action for action in actions if action.get("status") == status_filter]
    priority_filter = str(filters.get("priority") or "").strip().lower()
    if priority_filter:
        actions = [action for action in actions if action.get("priority") == normalise_priority(priority_filter)]

    actions.sort(key=lambda item: (item.get("status") != "overdue", item.get("due_date") or "9999-12-31", item.get("created_at") or ""))
    return actions[:limit]


def get_action(conn: Any, *, action_id: str, current_user: dict[str, Any]) -> dict[str, Any] | None:
    source_type, _, raw_id = action_id.partition(":")
    for action in list_actions(conn, current_user=current_user, limit=600):
        if action["id"] == action_id or (not raw_id and action["original_id"] == action_id):
            return action
        if raw_id and action["source_type"] == source_type and action["original_id"] == raw_id:
            return action
    return None


def update_action(conn: Any, *, action_id: str, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
    if not can_write_records(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to update actions.")

    action = get_action(conn, action_id=action_id, current_user=current_user)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found.")
    if action["original_table"] != "tasks":
        raise HTTPException(status_code=400, detail="This action source is read-only from the OS projection.")

    cols = table_columns(conn, "tasks")
    updates: list[str] = []
    params: list[Any] = []
    mapping = {
        "title": "title",
        "description": "task",
        "summary": "task",
        "status": "status",
        "priority": "priority",
        "due_date": "due_date",
        "assigned_to_staff_id": "assigned_to_user_id",
    }
    for key, column in mapping.items():
        if key not in payload or column not in cols:
            continue
        value = payload.get(key)
        if key == "status":
            value = normalise_status(value)
        if key == "priority":
            value = normalise_priority(value)
        updates.append(f"{quote_ident(column)} = %s")
        params.append(value)
    if "updated_at" in cols:
        updates.append("updated_at = NOW()")
    if payload.get("status") and "completed" in cols:
        completed = normalise_status(payload.get("status")) == "completed"
        updates.append("completed = %s")
        params.append(completed)
        if "completed_at" in cols:
            updates.append("completed_at = CASE WHEN %s THEN NOW() ELSE completed_at END")
            params.append(completed)

    if not updates:
        raise HTTPException(status_code=400, detail="No writable action fields provided.")

    raw_id = safe_int(action["original_id"])
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE public.tasks
            SET {", ".join(updates)}
            WHERE id = %s
            RETURNING *
            """,
            tuple(params + [raw_id]),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Action not found.")
    return _normalise_action(dict(row), ACTION_TABLES[0])


def create_action(conn: Any, *, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
    if not can_write_records(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to create actions.")
    if not table_exists(conn, "tasks"):
        raise HTTPException(status_code=400, detail="The tasks table is not available in this schema.")

    cols = table_columns(conn, "tasks")
    title = str(payload.get("title") or payload.get("description") or "Action").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Action title is required.")

    insert: dict[str, Any] = {}
    for column, value in {
        "title": title,
        "task": payload.get("description") or payload.get("summary") or title,
        "home_id": safe_int(payload.get("home_id")),
        "young_person_id": safe_int(payload.get("young_person_id")),
        "assigned_to_user_id": safe_int(payload.get("assigned_to_staff_id") or payload.get("assigned_to_user_id")),
        "assigned_role": payload.get("assigned_role"),
        "priority": normalise_priority(payload.get("priority")),
        "status": normalise_status(payload.get("status")),
        "source_table": payload.get("source_type") or payload.get("source_table"),
        "source_id": safe_int(payload.get("source_id")),
        "task_type": payload.get("task_type") or "os_action",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }.items():
        if column in cols and value is not None:
            insert[column] = value

    if "created_by_user_id" in cols:
        insert["created_by_user_id"] = current_user_id(current_user)

    if not insert:
        raise HTTPException(status_code=400, detail="No compatible task fields are available.")

    columns = list(insert.keys())
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            INSERT INTO public.tasks ({", ".join(quote_ident(col) for col in columns)})
            VALUES ({", ".join(["%s"] * len(columns))})
            RETURNING *
            """,
            tuple(insert[col] for col in columns),
        )
        row = cur.fetchone()
    return _normalise_action(dict(row), ACTION_TABLES[0])

