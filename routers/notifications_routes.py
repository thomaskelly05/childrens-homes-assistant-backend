from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor

from auth.dependencies import get_current_user
from db.connection import get_db

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _current_user_id(current_user: dict[str, Any]) -> int:
    user_id = _safe_int(current_user.get("user_id") or current_user.get("id"))
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


@router.get("")
def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    safe_limit = max(1, min(int(limit or 50), 100))

    unread_clause = "AND read_at IS NULL" if unread_only else ""

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
                id,
                title,
                body,
                notification_type,
                priority,
                href,
                source,
                source_ref_type,
                source_ref_id,
                home_id,
                young_person_id,
                read_at,
                dismissed_at,
                created_at
            FROM notifications
            WHERE user_id = %s
              AND dismissed_at IS NULL
              {unread_clause}
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (user_id, safe_limit),
        )
        return {"items": cur.fetchall(), "limit": safe_limit}


@router.get("/unread-count")
def unread_count(
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT COUNT(*)::int AS count
            FROM notifications
            WHERE user_id = %s
              AND read_at IS NULL
              AND dismissed_at IS NULL
            """,
            (user_id,),
        )
        row = cur.fetchone() or {"count": 0}
        return {"count": row.get("count", 0)}


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE notifications
            SET read_at = COALESCE(read_at, NOW())
            WHERE id = %s AND user_id = %s AND dismissed_at IS NULL
            RETURNING *
            """,
            (notification_id, user_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Notification not found")
        conn.commit()
        return {"ok": True, "notification": row}


@router.post("/mark-all-read")
def mark_all_read(
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE notifications
            SET read_at = COALESCE(read_at, NOW())
            WHERE user_id = %s
              AND read_at IS NULL
              AND dismissed_at IS NULL
            RETURNING id
            """,
            (user_id,),
        )
        rows = cur.fetchall()
        conn.commit()
        return {"ok": True, "updated": len(rows)}


@router.post("/{notification_id}/dismiss")
def dismiss_notification(
    notification_id: int,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE notifications
            SET dismissed_at = COALESCE(dismissed_at, NOW())
            WHERE id = %s AND user_id = %s
            RETURNING *
            """,
            (notification_id, user_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Notification not found")
        conn.commit()
        return {"ok": True, "notification": row}
