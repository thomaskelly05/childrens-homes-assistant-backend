from __future__ import annotations

import logging
import os
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor

from auth.dependencies import get_current_user
from db.connection import get_db

logger = logging.getLogger("indicare.notifications")
router = APIRouter(prefix="/notifications", tags=["Notifications"])

NOTIFICATION_READ_CACHE_TTL_SECONDS = int(os.getenv("NOTIFICATION_READ_CACHE_TTL_SECONDS", "12"))
_NOTIFICATION_LIST_CACHE: dict[tuple[int, bool, int], tuple[float, dict[str, Any]]] = {}
_NOTIFICATION_COUNT_CACHE: dict[int, tuple[float, dict[str, Any]]] = {}
_CACHE_MAX_ENTRIES = int(os.getenv("NOTIFICATION_CACHE_MAX_ENTRIES", "1000"))


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


def _rollback(conn) -> None:
    try:
        conn.rollback()
    except Exception:
        pass


def _notifications_unavailable_response(limit: int = 50) -> dict[str, Any]:
    return {
        "items": [],
        "limit": limit,
        "available": False,
        "message": "Notifications are not available yet. Run the notifications migration to enable this module.",
    }


def _now() -> float:
    return time.time()


def _prune_caches() -> None:
    for cache in (_NOTIFICATION_LIST_CACHE, _NOTIFICATION_COUNT_CACHE):
        while len(cache) > _CACHE_MAX_ENTRIES:
            first_key = next(iter(cache), None)
            if first_key is None:
                break
            cache.pop(first_key, None)


def _invalidate_user_cache(user_id: int) -> None:
    for key in list(_NOTIFICATION_LIST_CACHE.keys()):
        if key[0] == user_id:
            _NOTIFICATION_LIST_CACHE.pop(key, None)
    _NOTIFICATION_COUNT_CACHE.pop(user_id, None)


def _cached_list(user_id: int, unread_only: bool, limit: int) -> dict[str, Any] | None:
    cached = _NOTIFICATION_LIST_CACHE.get((user_id, unread_only, limit))
    if not cached:
        return None
    expires_at, payload = cached
    if expires_at <= _now():
        _NOTIFICATION_LIST_CACHE.pop((user_id, unread_only, limit), None)
        return None
    return {**payload, "cache": "memory"}


def _set_cached_list(user_id: int, unread_only: bool, limit: int, payload: dict[str, Any]) -> None:
    _NOTIFICATION_LIST_CACHE[(user_id, unread_only, limit)] = (_now() + NOTIFICATION_READ_CACHE_TTL_SECONDS, payload)
    _prune_caches()


def _cached_count(user_id: int) -> dict[str, Any] | None:
    cached = _NOTIFICATION_COUNT_CACHE.get(user_id)
    if not cached:
        return None
    expires_at, payload = cached
    if expires_at <= _now():
        _NOTIFICATION_COUNT_CACHE.pop(user_id, None)
        return None
    return {**payload, "cache": "memory"}


def _set_cached_count(user_id: int, payload: dict[str, Any]) -> None:
    _NOTIFICATION_COUNT_CACHE[user_id] = (_now() + NOTIFICATION_READ_CACHE_TTL_SECONDS, payload)
    _prune_caches()


@router.get("")
def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    safe_limit = max(1, min(int(limit or 50), 100))
    cached = _cached_list(user_id, unread_only, safe_limit)
    if cached is not None:
        return cached

    unread_clause = "AND read_at IS NULL" if unread_only else ""

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT
                    id,
                    title,
                    body,
                    body AS message,
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
            payload = {"items": cur.fetchall(), "limit": safe_limit, "available": True}
            _set_cached_list(user_id, unread_only, safe_limit, payload)
            return payload
    except Exception as exc:
        _rollback(conn)
        logger.warning("notifications_unavailable user_id=%s error=%s", user_id, exc)
        return _notifications_unavailable_response(safe_limit)


@router.get("/unread-count")
def unread_count(
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    cached = _cached_count(user_id)
    if cached is not None:
        return cached
    try:
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
            payload = {"count": row.get("count", 0), "available": True}
            _set_cached_count(user_id, payload)
            return payload
    except Exception as exc:
        _rollback(conn)
        logger.warning("notification_count_unavailable user_id=%s error=%s", user_id, exc)
        return {"count": 0, "available": False}


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    try:
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
            _invalidate_user_cache(user_id)
            return {"ok": True, "notification": row}
    except HTTPException:
        raise
    except Exception as exc:
        _rollback(conn)
        logger.warning("notification_mark_read_failed user_id=%s notification_id=%s error=%s", user_id, notification_id, exc)
        return {"ok": False, "available": False, "detail": "Notifications are not available yet."}


@router.post("/{notification_id}/acknowledge")
def acknowledge_notification(
    notification_id: int,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    result = mark_notification_read(notification_id=notification_id, conn=conn, current_user=current_user)
    if isinstance(result, dict):
        result["acknowledged"] = bool(result.get("ok"))
        result["action"] = "acknowledged"
    return result


@router.post("/{notification_id}/snooze")
def snooze_notification(
    notification_id: int,
    payload: dict[str, Any] | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM notifications
                WHERE id = %s AND user_id = %s AND dismissed_at IS NULL
                """,
                (notification_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Notification not found")
            _invalidate_user_cache(user_id)
            return {
                "ok": True,
                "notification": row,
                "snooze_foundation": True,
                "snooze_until": (payload or {}).get("snooze_until"),
                "detail": "Snooze state is acknowledged by the API contract; persistence can be enabled with a snooze_until column migration.",
            }
    except HTTPException:
        raise
    except Exception as exc:
        _rollback(conn)
        logger.warning("notification_snooze_failed user_id=%s notification_id=%s error=%s", user_id, notification_id, exc)
        return {"ok": False, "available": False, "detail": "Notifications are not available yet."}


@router.post("/mark-all-read")
def mark_all_read(
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    try:
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
            _invalidate_user_cache(user_id)
            return {"ok": True, "updated": len(rows)}
    except Exception as exc:
        _rollback(conn)
        logger.warning("notification_mark_all_failed user_id=%s error=%s", user_id, exc)
        return {"ok": False, "updated": 0, "available": False}


@router.post("/{notification_id}/dismiss")
def dismiss_notification(
    notification_id: int,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    try:
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
            _invalidate_user_cache(user_id)
            return {"ok": True, "notification": row}
    except HTTPException:
        raise
    except Exception as exc:
        _rollback(conn)
        logger.warning("notification_dismiss_failed user_id=%s notification_id=%s error=%s", user_id, notification_id, exc)
        return {"ok": False, "available": False, "detail": "Notifications are not available yet."}
