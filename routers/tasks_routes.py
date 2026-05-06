from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor

from auth.dependencies import get_current_user
from db.connection import get_db

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
    dependencies=[Depends(get_current_user)],
)

PROVIDER_LEVEL_ROLES = {"admin", "provider_admin", "regional_manager", "registered_manager", "manager"}


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _current_user_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("user_id") or current_user.get("id"))


def _role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _can_manage_tasks(current_user: dict[str, Any]) -> bool:
    return _role(current_user) in PROVIDER_LEVEL_ROLES


def _allowed_home_ids(current_user: dict[str, Any]) -> set[int]:
    values = current_user.get("allowed_home_ids") or current_user.get("allowedHomeIds") or []
    allowed: set[int] = set()
    if isinstance(values, list):
        for value in values:
            parsed = _safe_int(value)
            if parsed is not None:
                allowed.add(parsed)
    home_id = _safe_int(current_user.get("home_id") or current_user.get("homeId"))
    if home_id is not None:
        allowed.add(home_id)
    return allowed


def _assert_home_access(current_user: dict[str, Any], home_id: int | None) -> None:
    if home_id is None:
        return
    if _can_manage_tasks(current_user):
        return
    if home_id not in _allowed_home_ids(current_user):
        raise HTTPException(status_code=403, detail="Access denied")


def _effective_home_id(current_user: dict[str, Any], requested_home_id: int | None) -> int | None:
    if requested_home_id is not None:
        _assert_home_access(current_user, requested_home_id)
        return requested_home_id
    if _can_manage_tasks(current_user):
        return None
    allowed = _allowed_home_ids(current_user)
    if len(allowed) == 1:
        return next(iter(allowed))
    return _safe_int(current_user.get("home_id") or current_user.get("homeId"))


def _assert_task_access(current_user: dict[str, Any], task: dict[str, Any]) -> None:
    _assert_home_access(current_user, _safe_int(task.get("home_id")))


@router.get("/")
def get_tasks(
    home_id: int | None = None,
    assigned_to: int | None = None,
    status: str | None = None,
    mine: bool = False,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    filters = []
    params: list[Any] = []

    scoped_home_id = _effective_home_id(current_user, home_id)
    if scoped_home_id is not None:
        filters.append("home_id = %s")
        params.append(scoped_home_id)

    if mine:
        filters.append("assigned_to = %s")
        params.append(_current_user_id(current_user))
    elif assigned_to is not None:
        if not _can_manage_tasks(current_user) and assigned_to != _current_user_id(current_user):
            raise HTTPException(status_code=403, detail="Access denied")
        filters.append("assigned_to = %s")
        params.append(assigned_to)

    if status:
        filters.append("COALESCE(status, 'pending') = %s")
        params.append(status)

    where = "WHERE " + " AND ".join(filters) if filters else ""

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
                id,
                title,
                COALESCE(status, CASE WHEN completed THEN 'completed' ELSE 'pending' END) AS status,
                completed,
                priority,
                source,
                home_id,
                young_person_id,
                admission_id,
                assigned_to,
                due_at,
                created_at,
                CASE
                    WHEN COALESCE(status, 'pending') NOT IN ('completed', 'done', 'closed')
                         AND due_at IS NOT NULL
                         AND due_at < NOW()
                    THEN true ELSE false
                END AS is_overdue
            FROM tasks
            {where}
            ORDER BY
                CASE COALESCE(priority, 'normal')
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    ELSE 4
                END,
                due_at ASC NULLS LAST,
                created_at DESC
            """,
            tuple(params),
        )
        return cur.fetchall()


@router.get("/my")
def get_my_tasks(
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return get_tasks(mine=True, conn=conn, current_user=current_user)


@router.post("/")
def create_task(
    payload: dict[str, Any],
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    home_id = _safe_int(payload.get("home_id")) or _safe_int(current_user.get("home_id") or current_user.get("homeId"))
    _assert_home_access(current_user, home_id)

    assigned_to = _safe_int(payload.get("assigned_to"))
    if assigned_to is not None and not _can_manage_tasks(current_user) and assigned_to != _current_user_id(current_user):
        raise HTTPException(status_code=403, detail="Only managers can assign tasks to other staff")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO tasks (
                title, home_id, young_person_id, admission_id, assigned_to, due_at,
                source, priority, status, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, 'pending'), NOW())
            RETURNING *
            """,
            (
                payload.get("title"),
                home_id,
                payload.get("young_person_id"),
                payload.get("admission_id"),
                assigned_to,
                payload.get("due_at"),
                payload.get("source") or "manual",
                payload.get("priority") or "normal",
                payload.get("status"),
            ),
        )
        task = cur.fetchone()
        conn.commit()
        return task


@router.patch("/{task_id}")
def update_task(
    task_id: int,
    payload: dict[str, Any],
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")
        _assert_task_access(current_user, dict(existing))

        if payload.get("assigned_to") is not None and not _can_manage_tasks(current_user):
            raise HTTPException(status_code=403, detail="Only managers can reassign tasks")

        if payload.get("home_id") is not None:
            target_home_id = _safe_int(payload.get("home_id"))
            _assert_home_access(current_user, target_home_id)
        else:
            target_home_id = None

        new_status = payload.get("status")
        completed = existing.get("completed")
        if new_status in {"completed", "done", "closed"}:
            completed = True
        elif new_status in {"pending", "in_progress", "overdue"}:
            completed = False

        cur.execute(
            """
            UPDATE tasks
            SET title = COALESCE(%s, title),
                status = COALESCE(%s, status),
                completed = COALESCE(%s, completed),
                home_id = COALESCE(%s, home_id),
                young_person_id = COALESCE(%s, young_person_id),
                admission_id = COALESCE(%s, admission_id),
                assigned_to = COALESCE(%s, assigned_to),
                due_at = COALESCE(%s, due_at),
                priority = COALESCE(%s, priority),
                source = COALESCE(%s, source)
            WHERE id = %s
            RETURNING *
            """,
            (
                payload.get("title"),
                new_status,
                completed,
                target_home_id,
                payload.get("young_person_id"),
                payload.get("admission_id"),
                payload.get("assigned_to"),
                payload.get("due_at"),
                payload.get("priority"),
                payload.get("source"),
                task_id,
            ),
        )
        task = cur.fetchone()
        conn.commit()
        return task


@router.post("/{task_id}/assign")
def assign_task(
    task_id: int,
    payload: dict[str, Any],
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    if not _can_manage_tasks(current_user):
        raise HTTPException(status_code=403, detail="Only managers can assign tasks")
    return update_task(task_id, {"assigned_to": payload.get("assigned_to"), "status": payload.get("status") or "pending"}, conn=conn, current_user=current_user)


@router.post("/{task_id}/complete")
def complete_task(
    task_id: int,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return update_task(task_id, {"status": "completed"}, conn=conn, current_user=current_user)


@router.post("/escalate-overdue")
def escalate_overdue_tasks(
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    if not _can_manage_tasks(current_user):
        raise HTTPException(status_code=403, detail="Only managers can escalate overdue tasks")

    scoped_home_id = _effective_home_id(current_user, home_id)
    home_clause = "AND home_id = %s" if scoped_home_id is not None else ""
    params = (scoped_home_id,) if scoped_home_id is not None else ()

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE tasks
            SET status = 'overdue',
                priority = CASE
                    WHEN COALESCE(priority, 'normal') = 'critical' THEN 'critical'
                    ELSE 'high'
                END
            WHERE COALESCE(status, 'pending') NOT IN ('completed', 'done', 'closed')
              AND due_at IS NOT NULL
              AND due_at < NOW()
              {home_clause}
            RETURNING *
            """,
            params,
        )
        rows = cur.fetchall()
        conn.commit()
        return {"escalated": len(rows), "tasks": rows}
