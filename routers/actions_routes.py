from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from psycopg2.extras import RealDictCursor

from auth.dependencies import get_current_user
from db.connection import get_db

router = APIRouter(prefix="/actions", tags=["Actions"])

ADMIN_ROLES = {"admin", "provider_admin"}
COMPLETE_STATUSES = {"completed", "closed", "done", "resolved"}
IN_PROGRESS_STATUSES = {"in_progress", "in-progress", "pending", "awaiting"}
OPEN_STATUSES = {"open", "not_started", "new", ""}
OVERDUE_STATUSES = {"overdue", "late"}
ACTION_UPDATE_TYPES = {"progress", "escalation", "closure", "creation_note"}


class ActionCreatePayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: str = ""
    task: str | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    assigned_to_user_id: int | None = None
    assigned_role: str | None = None
    due_date: str | None = None
    priority: str | None = "medium"
    status: str | None = "open"
    action_type: str | None = None
    task_type: str | None = None
    source_type: str | None = None
    source_table: str | None = None
    source_id: int | None = None
    update_note: str | None = None
    closure_note: str | None = None


class ActionUpdatePayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: str | None = None
    task: str | None = None
    due_date: str | None = None
    priority: str | None = None
    status: str | None = None
    assigned_to_user_id: int | None = None
    assigned_role: str | None = None
    source_type: str | None = None
    source_table: str | None = None
    source_id: int | None = None
    update_note: str | None = None
    closure_note: str | None = None


class ActionProgressPayload(BaseModel):
    note: str = Field(..., min_length=1)
    update_type: str = "progress"
    status: str | None = None


def _safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except Exception:
        return None


def _normalise_text(value: Any) -> str:
    return str(value or "").strip()


def _normalise_token(value: Any) -> str:
    return _normalise_text(value).lower().replace("-", "_").replace(" ", "_")


def _normalise_role(current_user: dict[str, Any]) -> str:
    return _normalise_token(current_user.get("role"))


def _is_admin(current_user: dict[str, Any]) -> bool:
    return _normalise_role(current_user) in ADMIN_ROLES


def _parse_due_date(value: Any) -> date | None:
    if value is None:
        return None

    if isinstance(value, date) and not isinstance(value, datetime):
        return value

    if isinstance(value, datetime):
        return value.date()

    raw = _normalise_text(value)
    if not raw:
        return None

    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
    except Exception:
        return None


def _today_utc_date() -> date:
    return datetime.now(timezone.utc).date()


def _relation_exists(conn, relation_name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT to_regclass(%s) IS NOT NULL AS exists", (relation_name,))
        row = cur.fetchone()
    return bool(row and row[0])


def _table_columns(conn, table_name: str) -> set[str]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            """,
            (table_name,),
        )
        rows = cur.fetchall() or []
    return {str(row.get("column_name")) for row in rows if row.get("column_name")}


def _ensure_action_updates_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS task_updates (
                id BIGSERIAL PRIMARY KEY,
                task_id BIGINT NOT NULL,
                update_type TEXT NOT NULL DEFAULT 'progress',
                note TEXT NOT NULL,
                status TEXT NULL,
                created_by_user_id BIGINT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_task_updates_task_created
            ON task_updates (task_id, created_at DESC)
            """
        )


def _row_status(row: dict[str, Any]) -> str:
    raw_status = _normalise_token(row.get("status"))
    completed = bool(row.get("completed"))
    due_date = _parse_due_date(row.get("due_date"))
    is_complete = completed or raw_status in COMPLETE_STATUSES

    if is_complete:
        return "completed"

    if raw_status in OVERDUE_STATUSES:
        return "overdue"

    if due_date and due_date < _today_utc_date():
        return "overdue"

    if raw_status in IN_PROGRESS_STATUSES:
        return "in_progress"

    if raw_status in OPEN_STATUSES:
        return "open"

    return raw_status or "open"


def _bool_escalated(priority: str, status: str) -> bool:
    return status == "overdue" or priority in {"critical", "high"}


def _build_task_action(row: dict[str, Any]) -> dict[str, Any]:
    status = _row_status(row)
    priority = _normalise_token(row.get("priority")) or "medium"

    return {
        "id": row.get("id"),
        "record_type": "task",
        "title": row.get("title") or row.get("task") or "Action",
        "summary": row.get("task") or row.get("summary") or row.get("description") or "",
        "status": status,
        "priority": priority,
        "due_date": row.get("due_date"),
        "completed": status == "completed",
        "completed_at": row.get("completed_at"),
        "owner_user_id": row.get("assigned_to_user_id") or row.get("staff_id"),
        "owner_role": row.get("assigned_role") or "",
        "young_person_id": row.get("young_person_id"),
        "home_id": row.get("home_id"),
        "provider_id": row.get("provider_id"),
        "source_type": row.get("source_table"),
        "source_id": row.get("source_id"),
        "task_type": row.get("task_type"),
        "updated_at": row.get("updated_at") or row.get("created_at"),
        "created_at": row.get("created_at"),
        "visible_scopes": [
            scope
            for scope, allowed in (
                ("child", bool(row.get("young_person_id"))),
                ("home", bool(row.get("home_id"))),
                ("quality", bool(row.get("home_id"))),
                ("ofsted", bool(row.get("home_id"))),
            )
            if allowed
        ],
        "is_escalated": _bool_escalated(priority, status),
    }


def _build_inspection_action(row: dict[str, Any]) -> dict[str, Any]:
    status = _normalise_token(row.get("status")) or "open"
    priority = _normalise_token(row.get("priority")) or "medium"

    return {
        "id": f"inspection-{row.get('id') or row.get('line_of_enquiry_id') or row.get('inspection_score_id') or row.get('action_title')}",
        "record_type": "inspection_action",
        "title": row.get("action_title") or "Inspection action",
        "summary": row.get("action_description") or row.get("summary") or "",
        "status": status,
        "priority": priority,
        "due_date": row.get("due_date") or row.get("action_due_date"),
        "completed": status in COMPLETE_STATUSES,
        "completed_at": None,
        "owner_user_id": row.get("owner_user_id"),
        "owner_role": row.get("assigned_role") or "",
        "young_person_id": row.get("young_person_id"),
        "home_id": row.get("home_id"),
        "provider_id": row.get("provider_id"),
        "source_type": "inspection_action",
        "source_id": row.get("id") or row.get("line_of_enquiry_id") or row.get("inspection_score_id"),
        "task_type": "inspection_improvement",
        "updated_at": row.get("updated_at") or row.get("scored_at"),
        "created_at": row.get("created_at") or row.get("scored_at"),
        "visible_scopes": ["home", "quality", "ofsted"],
        "is_escalated": _bool_escalated(priority, status),
    }


def _ensure_home_access(
    *,
    current_user: dict[str, Any],
    requested_home_id: int | None,
) -> int | None:
    user_home_id = _safe_int(current_user.get("home_id"))
    is_admin = _is_admin(current_user)

    if is_admin:
        return requested_home_id if requested_home_id is not None else user_home_id

    if user_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified.")

    if requested_home_id is not None and requested_home_id != user_home_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this home's actions.",
        )

    return user_home_id


def _ensure_task_access(conn, task_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM tasks WHERE id = %s LIMIT 1", (task_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Action not found.")

    row_dict = dict(row)
    resolved_home_id = _ensure_home_access(
        current_user=current_user,
        requested_home_id=_safe_int(row_dict.get("home_id")),
    )
    if resolved_home_id is None and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Home access could not be verified.")

    return row_dict


def _insert_action_update(
    conn,
    *,
    task_id: int,
    note: str,
    update_type: str = "progress",
    status: str | None = None,
    created_by_user_id: int | None = None,
) -> dict[str, Any]:
    _ensure_action_updates_table(conn)

    safe_note = _normalise_text(note)
    if not safe_note:
        raise HTTPException(status_code=400, detail="Action update note cannot be empty.")

    safe_update_type = _normalise_token(update_type)
    if safe_update_type not in ACTION_UPDATE_TYPES:
        safe_update_type = "progress"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO task_updates (task_id, update_type, note, status, created_by_user_id, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            RETURNING id, task_id, update_type, note, status, created_by_user_id, created_at
            """,
            (task_id, safe_update_type, safe_note, status, created_by_user_id),
        )
        row = cur.fetchone()
    return dict(row or {})


def _attach_latest_updates(conn, actions: list[dict[str, Any]]) -> None:
    if not actions or not _relation_exists(conn, "task_updates"):
        return

    task_ids = [
        _safe_int(item.get("id"))
        for item in actions
        if item.get("record_type") == "task"
    ]
    task_ids = [task_id for task_id in task_ids if task_id is not None]
    if not task_ids:
        return

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT DISTINCT ON (task_id)
                task_id,
                id,
                update_type,
                note,
                status,
                created_by_user_id,
                created_at
            FROM task_updates
            WHERE task_id = ANY(%s)
            ORDER BY task_id, created_at DESC, id DESC
            """,
            (task_ids,),
        )
        latest_rows = cur.fetchall() or []

    latest_by_task = {
        int(row["task_id"]): dict(row)
        for row in latest_rows
        if row.get("task_id") is not None
    }

    for item in actions:
        if item.get("record_type") != "task":
            continue
        task_id = _safe_int(item.get("id"))
        if task_id and task_id in latest_by_task:
            item["latest_update"] = latest_by_task[task_id]


def _sort_due_value(value: Any) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text_value = _normalise_text(value)
    return text_value or "9999-12-31"


@router.get("/")
def list_actions(
    scope: str | None = Query(default=None),
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    owner_user_id: int | None = Query(default=None),
    source_type: str | None = Query(default=None),
    source_id: int | None = Query(default=None),
    priority: str | None = Query(default=None),
    status: str | None = Query(default=None),
    include_completed: bool = Query(default=True),
    include_inspection_actions: bool = Query(default=True),
    limit: int = Query(default=250, ge=1, le=600),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    safe_scope = _normalise_token(scope or "")
    resolved_home_id = _ensure_home_access(
        current_user=current_user,
        requested_home_id=home_id,
    )

    where_clauses = ["1=1"]
    params: list[Any] = []

    if resolved_home_id is not None:
        where_clauses.append("home_id = %s")
        params.append(resolved_home_id)

    if young_person_id is not None:
        where_clauses.append("young_person_id = %s")
        params.append(young_person_id)

    if owner_user_id is not None:
        where_clauses.append("COALESCE(assigned_to_user_id, staff_id) = %s")
        params.append(owner_user_id)

    if source_id is not None:
        where_clauses.append("source_id = %s")
        params.append(source_id)

    safe_source_type = _normalise_text(source_type)
    if safe_source_type:
        where_clauses.append("LOWER(COALESCE(source_table, '')) = %s")
        params.append(_normalise_token(safe_source_type))

    safe_priority = _normalise_token(priority or "")

    params.append(limit)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT *
            FROM tasks
            WHERE {" AND ".join(where_clauses)}
            ORDER BY due_date ASC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
            LIMIT %s
            """,
            tuple(params),
        )
        task_rows = [dict(row) for row in (cur.fetchall() or [])]

    actions = [_build_task_action(row) for row in task_rows]

    if include_inspection_actions and safe_scope in {"home", "quality", "ofsted", ""}:
        if _relation_exists(conn, "vw_ui_inspection_action_board"):
            query = "SELECT * FROM vw_ui_inspection_action_board"
            inspection_params: list[Any] = []
            if resolved_home_id is not None:
                query += " WHERE home_id = %s"
                inspection_params.append(resolved_home_id)
            query += " ORDER BY due_date ASC NULLS LAST, action_impact_priority_score DESC NULLS LAST LIMIT %s"
            inspection_params.append(limit)
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, tuple(inspection_params))
                inspection_rows = [dict(row) for row in (cur.fetchall() or [])]
            actions.extend(_build_inspection_action(row) for row in inspection_rows)

    safe_status = _normalise_token(status or "")
    filtered: list[dict[str, Any]] = []
    for item in actions:
        if not include_completed and item.get("status") == "completed":
            continue
        if safe_status and _normalise_token(item.get("status")) != safe_status:
            continue
        if safe_priority and _normalise_token(item.get("priority")) != safe_priority:
            continue
        if safe_scope and safe_scope not in set(item.get("visible_scopes") or []):
            continue
        filtered.append(item)

    filtered.sort(
        key=lambda item: (
            0 if item.get("status") == "overdue" else 1,
            0 if _normalise_token(item.get("priority")) in {"critical", "high"} else 1,
            _sort_due_value(item.get("due_date")),
            item.get("updated_at") or item.get("created_at") or "",
        )
    )

    _attach_latest_updates(conn, filtered)

    counts = {
        "total": len(filtered),
        "open": len([row for row in filtered if row.get("status") == "open"]),
        "in_progress": len([row for row in filtered if row.get("status") == "in_progress"]),
        "overdue": len([row for row in filtered if row.get("status") == "overdue"]),
        "completed": len([row for row in filtered if row.get("status") == "completed"]),
        "escalated": len([row for row in filtered if row.get("is_escalated")]),
    }

    return {"items": filtered, "actions": filtered, "counts": counts}


@router.post("/")
def create_action(
    payload: ActionCreatePayload,
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    data = payload.model_dump(exclude_none=True)
    columns = _table_columns(conn, "tasks")
    if not columns:
        raise HTTPException(status_code=500, detail="Tasks table metadata could not be loaded.")

    title = _normalise_text(data.get("title"))
    task_text = _normalise_text(data.get("task"))
    if not title and not task_text:
        raise HTTPException(status_code=400, detail="Action title or task description is required.")

    requested_home_id = _safe_int(data.get("home_id"))
    resolved_home_id = _ensure_home_access(
        current_user=current_user,
        requested_home_id=requested_home_id,
    )

    now = datetime.now(timezone.utc)
    status = _normalise_token(data.get("status") or "open")
    is_complete = status in COMPLETE_STATUSES
    due_date = _parse_due_date(data.get("due_date"))

    source_type = _normalise_text(data.get("source_type") or data.get("source_table"))
    source_id = _safe_int(data.get("source_id"))
    task_type = _normalise_text(data.get("task_type") or data.get("action_type") or "general")

    insert_data: dict[str, Any] = {}
    if "title" in columns:
        insert_data["title"] = title or task_text or "Action"
    if "task" in columns:
        insert_data["task"] = task_text or title or "Action"
    if "home_id" in columns:
        insert_data["home_id"] = resolved_home_id
    if "young_person_id" in columns:
        insert_data["young_person_id"] = _safe_int(data.get("young_person_id"))
    if "assigned_to_user_id" in columns:
        insert_data["assigned_to_user_id"] = _safe_int(data.get("assigned_to_user_id"))
    if "assigned_role" in columns:
        insert_data["assigned_role"] = _normalise_text(data.get("assigned_role"))
    if "priority" in columns:
        insert_data["priority"] = _normalise_token(data.get("priority") or "medium")
    if "status" in columns:
        insert_data["status"] = status
    if "task_type" in columns:
        insert_data["task_type"] = task_type or "general"
    if "source_table" in columns:
        insert_data["source_table"] = source_type
    if "source_id" in columns:
        insert_data["source_id"] = source_id
    if "due_date" in columns:
        insert_data["due_date"] = due_date
    if "task_date" in columns:
        insert_data["task_date"] = now.date()
    if "completed" in columns:
        insert_data["completed"] = is_complete
    if "completed_at" in columns:
        insert_data["completed_at"] = now if is_complete else None
    if "completed_by_user_id" in columns:
        insert_data["completed_by_user_id"] = (
            _safe_int(current_user.get("user_id")) if is_complete else None
        )
    if "provider_id" in columns:
        provider_id = _safe_int(current_user.get("provider_id"))
        insert_data["provider_id"] = provider_id
    if "created_at" in columns:
        insert_data["created_at"] = now
    if "updated_at" in columns:
        insert_data["updated_at"] = now

    safe_columns = [key for key, value in insert_data.items() if value is not None]
    if not safe_columns:
        raise HTTPException(status_code=500, detail="No writable action columns are available.")

    placeholders = ", ".join(["%s"] * len(safe_columns))
    query = f"""
        INSERT INTO tasks ({", ".join(safe_columns)})
        VALUES ({placeholders})
        RETURNING *
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, tuple(insert_data[key] for key in safe_columns))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=500, detail="Action could not be created.")

    created = _build_task_action(dict(row))

    creator_user_id = _safe_int(current_user.get("user_id"))
    if _normalise_text(data.get("update_note")):
        created["last_update"] = _insert_action_update(
            conn,
            task_id=int(created["id"]),
            note=_normalise_text(data.get("update_note")),
            update_type="creation_note",
            status=created.get("status"),
            created_by_user_id=creator_user_id,
        )

    if _normalise_text(data.get("closure_note")) and created.get("status") == "completed":
        created["closure_update"] = _insert_action_update(
            conn,
            task_id=int(created["id"]),
            note=_normalise_text(data.get("closure_note")),
            update_type="closure",
            status="completed",
            created_by_user_id=creator_user_id,
        )

    return {"ok": True, "item": created, "action": created}


@router.patch("/{action_id}")
def update_action(
    action_id: int,
    payload: ActionUpdatePayload,
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    _ensure_task_access(conn, action_id, current_user)
    columns = _table_columns(conn, "tasks")
    if not columns:
        raise HTTPException(status_code=500, detail="Tasks table metadata could not be loaded.")

    data = payload.model_dump(exclude_unset=True)
    fields: list[str] = []
    values: list[Any] = []

    status = _normalise_token(data.get("status")) if "status" in data else None
    is_complete = status in COMPLETE_STATUSES if status is not None else None

    mapping = {
        "title": ("title", _normalise_text(data.get("title"))),
        "task": ("task", _normalise_text(data.get("task"))),
        "priority": ("priority", _normalise_token(data.get("priority"))),
        "assigned_to_user_id": ("assigned_to_user_id", _safe_int(data.get("assigned_to_user_id"))),
        "assigned_role": ("assigned_role", _normalise_text(data.get("assigned_role"))),
        "source_table": (
            "source_table",
            _normalise_text(data.get("source_table") or data.get("source_type")),
        ),
        "source_id": ("source_id", _safe_int(data.get("source_id"))),
    }

    for request_key, (column, value) in mapping.items():
        if request_key not in data:
            continue
        if column not in columns:
            continue
        fields.append(f"{column} = %s")
        values.append(value)

    if "due_date" in data and "due_date" in columns:
        fields.append("due_date = %s")
        values.append(_parse_due_date(data.get("due_date")))

    if status is not None and "status" in columns:
        fields.append("status = %s")
        values.append(status)

    if is_complete is not None:
        now = datetime.now(timezone.utc)
        if "completed" in columns:
            fields.append("completed = %s")
            values.append(is_complete)
        if "completed_at" in columns:
            fields.append("completed_at = %s")
            values.append(now if is_complete else None)
        if "completed_by_user_id" in columns:
            fields.append("completed_by_user_id = %s")
            values.append(_safe_int(current_user.get("user_id")) if is_complete else None)

    if "updated_at" in columns:
        fields.append("updated_at = NOW()")

    if not fields:
        raise HTTPException(status_code=400, detail="No valid action fields provided for update.")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE tasks
            SET {", ".join(fields)}
            WHERE id = %s
            RETURNING *
            """,
            tuple(values + [action_id]),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Action not found.")

    updated = _build_task_action(dict(row))
    user_id = _safe_int(current_user.get("user_id"))
    update_note = _normalise_text(data.get("update_note"))
    closure_note = _normalise_text(data.get("closure_note"))

    if update_note:
        updated["last_update"] = _insert_action_update(
            conn,
            task_id=action_id,
            note=update_note,
            update_type="progress",
            status=updated.get("status"),
            created_by_user_id=user_id,
        )

    if closure_note:
        updated["closure_update"] = _insert_action_update(
            conn,
            task_id=action_id,
            note=closure_note,
            update_type="closure",
            status=updated.get("status"),
            created_by_user_id=user_id,
        )

    return {"ok": True, "item": updated, "action": updated}


@router.get("/{action_id}/updates")
def list_action_updates(
    action_id: int,
    limit: int = Query(default=40, ge=1, le=200),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    _ensure_task_access(conn, action_id, current_user)
    _ensure_action_updates_table(conn)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, task_id, update_type, note, status, created_by_user_id, created_at
            FROM task_updates
            WHERE task_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT %s
            """,
            (action_id, limit),
        )
        rows = [dict(row) for row in (cur.fetchall() or [])]

    return {"items": rows, "updates": rows}


@router.post("/{action_id}/updates")
def create_action_update(
    action_id: int,
    payload: ActionProgressPayload,
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    _ensure_task_access(conn, action_id, current_user)
    update_type = _normalise_token(payload.update_type or "progress")
    status = _normalise_token(payload.status or "")
    user_id = _safe_int(current_user.get("user_id"))

    if status:
        update_payload = ActionUpdatePayload(status=status)
        update_action(action_id, update_payload, current_user=current_user, conn=conn)

    update = _insert_action_update(
        conn,
        task_id=action_id,
        note=payload.note,
        update_type=update_type,
        status=status or None,
        created_by_user_id=user_id,
    )

    return {"ok": True, "item": update, "update": update}
