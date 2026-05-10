from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth.dependencies import get_current_user
from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix="/workspace/review", tags=["workspace-review"])

MANAGER_ROLES = {
    "admin",
    "provider_admin",
    "super_admin",
    "superadmin",
    "administrator",
    "manager",
    "registered_manager",
    "deputy_manager",
    "responsible_individual",
    "ri",
}


class ReviewDecisionRequest(BaseModel):
    comment: str | None = None


def _safe_int(value: Any) -> int | None:
    try:
        parsed = int(value)
        return parsed if parsed > 0 else None
    except Exception:
        return None


def _current_user_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("id") or current_user.get("user_id") or current_user.get("sub"))


def _current_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))


def _role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or current_user.get("user_role") or "").strip().lower()


def _is_manager(current_user: dict[str, Any]) -> bool:
    return _role(current_user) in MANAGER_ROLES


def _columns(conn, table_name: str) -> set[str]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s",
            (table_name,),
        )
        return {str(row["column_name"] if isinstance(row, dict) else row[0]) for row in cur.fetchall()}


def _table_exists(conn, table_name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists",
            (table_name,),
        )
        row = cur.fetchone()
    return bool(row.get("exists") if isinstance(row, dict) else row and row[0])


def _fetch_review_item(conn, item_id: int) -> dict[str, Any]:
    if not _table_exists(conn, "manager_review_queue"):
        raise HTTPException(status_code=404, detail="manager_review_queue table is not available")
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM manager_review_queue WHERE id = %s LIMIT 1", (item_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Review item not found")
    return dict(row)


def _assert_review_access(current_user: dict[str, Any], item: dict[str, Any] | None = None) -> None:
    if _is_manager(current_user):
        user_home_id = _current_home_id(current_user)
        role = _role(current_user)
        if role in {"admin", "provider_admin", "super_admin", "superadmin", "administrator", "responsible_individual", "ri"}:
            return
        if item is None:
            return
        item_home_id = _safe_int(item.get("home_id"))
        if item_home_id and user_home_id and item_home_id != user_home_id:
            raise HTTPException(status_code=403, detail="Review item is outside your home")
        return
    raise HTTPException(status_code=403, detail="Manager review access required")


def _update_source_record(conn, item: dict[str, Any], status: str, comment: str | None, reviewer_id: int | None) -> None:
    source_table = str(item.get("source_table") or "").strip()
    source_id = _safe_int(item.get("source_id"))
    if not source_table or not source_id or not _table_exists(conn, source_table):
        return
    columns = _columns(conn, source_table)
    updates: list[str] = []
    params: list[Any] = []
    if "manager_review_status" in columns:
        updates.append("manager_review_status = %s")
        params.append(status)
    if "workflow_status" in columns:
        updates.append("workflow_status = %s")
        params.append(status)
    if "manager_review_comment" in columns and comment is not None:
        updates.append("manager_review_comment = %s")
        params.append(comment)
    if "reviewed_by" in columns and reviewer_id:
        updates.append("reviewed_by = %s")
        params.append(reviewer_id)
    if "reviewed_at" in columns:
        updates.append("reviewed_at = NOW()")
    if "updated_at" in columns:
        updates.append("updated_at = NOW()")
    if not updates:
        return
    params.append(source_id)
    with conn.cursor() as cur:
        cur.execute(f'UPDATE public."{source_table}" SET {", ".join(updates)} WHERE id = %s', tuple(params))


def _audit_review(conn, item: dict[str, Any], action: str, comment: str | None, reviewer_id: int | None) -> None:
    if _table_exists(conn, "leadership_oversight_log"):
        columns = _columns(conn, "leadership_oversight_log")
        payload = {
            "home_id": item.get("home_id"),
            "young_person_id": item.get("young_person_id"),
            "manager_id": reviewer_id,
            "action": action,
            "area": "manager_review_queue",
            "summary": item.get("summary") or f"Manager review {action}",
            "outcome": comment or action,
            "created_at": "NOW()",
        }
        values = {key: value for key, value in payload.items() if key in columns and value is not None}
        if values:
            col_sql = ", ".join(f'"{key}"' for key in values)
            placeholders = []
            params = []
            for value in values.values():
                if value == "NOW()":
                    placeholders.append("NOW()")
                else:
                    placeholders.append("%s")
                    params.append(value)
            with conn.cursor() as cur:
                cur.execute(
                    f'INSERT INTO public."leadership_oversight_log" ({col_sql}) VALUES ({", ".join(placeholders)})',
                    tuple(params),
                )


@router.get("/queue")
def list_review_queue(
    status: str | None = Query(default="pending"),
    limit: int = Query(default=100, ge=1, le=300),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _assert_review_access(current_user)
    conn = None
    try:
        conn = get_db_connection()
        if not _table_exists(conn, "manager_review_queue"):
            return {"ok": True, "items": [], "count": 0, "warning": "manager_review_queue table is not available"}
        columns = _columns(conn, "manager_review_queue")
        where = ["1=1"]
        params: list[Any] = []
        if status and "status" in columns:
            where.append("status = %s")
            params.append(status)
        role = _role(current_user)
        home_id = _current_home_id(current_user)
        if home_id and "home_id" in columns and role not in {"admin", "provider_admin", "super_admin", "superadmin", "administrator", "responsible_individual", "ri"}:
            where.append("home_id = %s")
            params.append(home_id)
        params.append(limit)
        order_col = "created_at" if "created_at" in columns else "id"
        with conn.cursor() as cur:
            cur.execute(
                f'SELECT * FROM public."manager_review_queue" WHERE {" AND ".join(where)} ORDER BY "{order_col}" DESC NULLS LAST LIMIT %s',
                tuple(params),
            )
            rows = [dict(row) for row in cur.fetchall()]
        return {"ok": True, "items": rows, "count": len(rows)}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post("/queue/{item_id}/approve")
def approve_review_item(
    item_id: int,
    payload: ReviewDecisionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _review_decision(item_id=item_id, status="approved", action="approved_record", comment=payload.comment, current_user=current_user)


@router.post("/queue/{item_id}/return")
def return_review_item(
    item_id: int,
    payload: ReviewDecisionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _review_decision(item_id=item_id, status="returned", action="returned_record", comment=payload.comment, current_user=current_user)


@router.post("/queue/{item_id}/acknowledge")
def acknowledge_review_item(
    item_id: int,
    payload: ReviewDecisionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _review_decision(item_id=item_id, status="acknowledged", action="acknowledged_record", comment=payload.comment, current_user=current_user)


def _review_decision(item_id: int, status: str, action: str, comment: str | None, current_user: dict[str, Any]) -> dict[str, Any]:
    reviewer_id = _current_user_id(current_user)
    if not reviewer_id:
        raise HTTPException(status_code=401, detail="Invalid user")
    conn = None
    try:
        conn = get_db_connection()
        item = _fetch_review_item(conn, item_id)
        _assert_review_access(current_user, item)
        columns = _columns(conn, "manager_review_queue")
        updates: list[str] = []
        params: list[Any] = []
        if "status" in columns:
            updates.append("status = %s")
            params.append(status)
        if "review_status" in columns:
            updates.append("review_status = %s")
            params.append(status)
        if "manager_comment" in columns:
            updates.append("manager_comment = %s")
            params.append(comment)
        if "review_comment" in columns:
            updates.append("review_comment = %s")
            params.append(comment)
        if "reviewed_by" in columns:
            updates.append("reviewed_by = %s")
            params.append(reviewer_id)
        if "reviewed_at" in columns:
            updates.append("reviewed_at = NOW()")
        if "updated_at" in columns:
            updates.append("updated_at = NOW()")
        if updates:
            params.append(item_id)
            with conn.cursor() as cur:
                cur.execute(f'UPDATE public."manager_review_queue" SET {", ".join(updates)} WHERE id = %s', tuple(params))
        _update_source_record(conn, item, status, comment, reviewer_id)
        _audit_review(conn, item, action, comment, reviewer_id)
        conn.commit()
        return {"ok": True, "status": status, "message": f"Review item {status}"}
    except HTTPException:
        if conn is not None:
            conn.rollback()
        raise
    except Exception as exc:
        if conn is not None:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Could not update review item: {exc}")
    finally:
        if conn is not None:
            release_db_connection(conn)
