from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import psycopg2
from psycopg2.extras import Json, RealDictCursor

logger = logging.getLogger(__name__)


TRIAL_DAYS = 7


def _row(row) -> dict[str, Any] | None:
    return dict(row) if row else None


def _has_orb_table_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return (
        isinstance(exc, (psycopg2.errors.UndefinedTable, psycopg2.errors.UndefinedColumn))
        or "orb_trials" in text
        or "orb_user_preferences" in text
        or "orb_saved_projects" in text
        or "orb_saved_outputs" in text
        or "orb_usage_events" in text
        or "does not exist" in text
    )


def _safe_rollback(conn) -> None:
    try:
        conn.rollback()
    except Exception:
        logger.debug("Could not rollback ORB residential fallback transaction", exc_info=True)


def _user_allows_orb(user: dict[str, Any]) -> bool:
    role = str(user.get("role") or "").strip().lower()
    plan = str(user.get("plan_name") or "").strip().lower()
    subscription_status = str(user.get("subscription_status") or "").strip().lower()
    return bool(user.get("subscription_active")) or role in {
        "admin",
        "super_admin",
        "superadmin",
        "founder",
        "owner",
    } or "founding" in plan or subscription_status == "active"


def get_orb_access_state(conn, user_id: int) -> dict[str, Any]:
    """Return premium access state for ORB Residential.

    Active subscription wins. Otherwise an active unexpired trial grants access.
    If the ORB premium migration has not yet been applied, do not crash the rich
    /orb chat. Fall back to the user's core subscription/admin state and surface a
    migration note in the access payload.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                subscription_active,
                subscription_status,
                plan_name,
                current_period_end,
                role
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        user = _row(cur.fetchone()) or {}

    trial = None
    trial_table_missing = False
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    status,
                    started_at,
                    expires_at,
                    converted_at,
                    source
                FROM orb_trials
                WHERE user_id = %s
                ORDER BY started_at DESC
                LIMIT 1
                """,
                (user_id,),
            )
            trial = _row(cur.fetchone())
    except Exception as exc:
        if not _has_orb_table_error(exc):
            raise
        trial_table_missing = True
        _safe_rollback(conn)
        logger.warning(
            "ORB premium trial table unavailable; falling back to user subscription state for user_id=%s",
            user_id,
        )

    now = datetime.now(timezone.utc)
    subscription_active = bool(user.get("subscription_active"))
    trial_active = False
    if trial:
        expires_at = trial.get("expires_at")
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        trial_active = trial.get("status") == "active" and bool(expires_at and expires_at > now)

    fallback_allowed = _user_allows_orb(user) if trial_table_missing else False
    can_use_orb = subscription_active or trial_active or fallback_allowed
    access_reason = (
        "subscription"
        if subscription_active
        else "trial"
        if trial_active
        else "subscription_fallback_pending_orb_migration"
        if fallback_allowed
        else "locked"
    )

    return {
        "user_id": user_id,
        "subscription_active": subscription_active,
        "subscription_status": user.get("subscription_status"),
        "plan_name": user.get("plan_name"),
        "current_period_end": user.get("current_period_end"),
        "trial": trial,
        "trial_active": trial_active,
        "trial_table_missing": trial_table_missing,
        "can_use_orb": can_use_orb,
        "access_reason": access_reason,
        "migration_required": trial_table_missing,
    }


def start_orb_trial(conn, user_id: int, *, source: str | None = None, days: int = TRIAL_DAYS) -> dict[str, Any]:
    expires_at = datetime.now(timezone.utc) + timedelta(days=max(1, int(days)))
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO orb_trials (user_id, expires_at, source)
                VALUES (%s, %s, %s)
                RETURNING id, user_id, status, started_at, expires_at, converted_at, source
                """,
                (user_id, expires_at, source),
            )
            row = cur.fetchone()
        return dict(row)
    except Exception as exc:
        if not _has_orb_table_error(exc):
            raise
        _safe_rollback(conn)
        logger.warning("ORB trial start requested before premium migration was applied for user_id=%s", user_id)
        return {
            "id": None,
            "user_id": user_id,
            "status": "unavailable_migration_required",
            "started_at": None,
            "expires_at": None,
            "converted_at": None,
            "source": source,
            "migration_required": True,
        }


def mark_orb_trial_converted(conn, user_id: int) -> dict[str, Any] | None:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE orb_trials
                SET status = 'converted', converted_at = NOW(), updated_at = NOW()
                WHERE id = (
                    SELECT id FROM orb_trials
                    WHERE user_id = %s
                    ORDER BY started_at DESC
                    LIMIT 1
                )
                RETURNING id, user_id, status, started_at, expires_at, converted_at, source
                """,
                (user_id,),
            )
            return _row(cur.fetchone())
    except Exception as exc:
        if not _has_orb_table_error(exc):
            raise
        _safe_rollback(conn)
        return None


def record_orb_usage_event(
    conn,
    *,
    user_id: int | None,
    event_type: str = "conversation",
    mode: str | None = None,
    workflow: str | None = None,
    model: str | None = None,
    tokens_in: int = 0,
    tokens_out: int = 0,
    estimated_cost: float = 0,
    latency_ms: int | None = None,
    success: bool = True,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO orb_usage_events (
                    user_id, event_type, mode, workflow, model,
                    tokens_in, tokens_out, estimated_cost, latency_ms, success, metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, user_id, event_type, mode, workflow, model, tokens_in, tokens_out,
                          estimated_cost, latency_ms, success, metadata, created_at
                """,
                (
                    user_id,
                    event_type,
                    mode,
                    workflow,
                    model,
                    max(0, int(tokens_in or 0)),
                    max(0, int(tokens_out or 0)),
                    estimated_cost or 0,
                    latency_ms,
                    success,
                    Json(metadata or {}),
                ),
            )
            return dict(cur.fetchone())
    except Exception as exc:
        if not _has_orb_table_error(exc):
            raise
        _safe_rollback(conn)
        logger.debug("ORB usage event skipped because premium migration is not applied", exc_info=True)
        return {
            "id": None,
            "user_id": user_id,
            "event_type": event_type,
            "mode": mode,
            "workflow": workflow,
            "model": model,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "estimated_cost": estimated_cost,
            "latency_ms": latency_ms,
            "success": success,
            "metadata": metadata or {},
            "migration_required": True,
        }


def upsert_orb_user_preferences(
    conn,
    *,
    user_id: int,
    role_label: str | None = None,
    work_environment: str | None = None,
    preferred_support_style: str | None = None,
    onboarding_completed: bool = False,
    preferences: dict[str, Any] | None = None,
) -> dict[str, Any]:
    completed_expr = "NOW()" if onboarding_completed else "orb_user_preferences.onboarding_completed_at"
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            INSERT INTO orb_user_preferences (
                user_id, role_label, work_environment, preferred_support_style,
                onboarding_completed_at, preferences
            )
            VALUES (%s, %s, %s, %s, {'NOW()' if onboarding_completed else 'NULL'}, %s)
            ON CONFLICT (user_id) DO UPDATE SET
                role_label = COALESCE(EXCLUDED.role_label, orb_user_preferences.role_label),
                work_environment = COALESCE(EXCLUDED.work_environment, orb_user_preferences.work_environment),
                preferred_support_style = COALESCE(EXCLUDED.preferred_support_style, orb_user_preferences.preferred_support_style),
                onboarding_completed_at = {completed_expr},
                preferences = orb_user_preferences.preferences || EXCLUDED.preferences,
                updated_at = NOW()
            RETURNING user_id, role_label, work_environment, preferred_support_style,
                      onboarding_completed_at, preferences, created_at, updated_at
            """,
            (
                user_id,
                role_label,
                work_environment,
                preferred_support_style,
                Json(preferences or {}),
            ),
        )
        return dict(cur.fetchone())


def get_orb_user_preferences(conn, user_id: int) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT user_id, role_label, work_environment, preferred_support_style,
                   onboarding_completed_at, preferences, created_at, updated_at
            FROM orb_user_preferences
            WHERE user_id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        return _row(cur.fetchone())


def create_orb_saved_project(
    conn,
    *,
    user_id: int,
    title: str,
    description: str | None = None,
    project_type: str = "general",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO orb_saved_projects (user_id, title, description, project_type, metadata)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, user_id, title, description, project_type, metadata, created_at, updated_at
            """,
            (user_id, title.strip(), description, project_type, Json(metadata or {})),
        )
        return dict(cur.fetchone())


def list_orb_saved_projects(conn, *, user_id: int, limit: int = 50) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, user_id, title, description, project_type, metadata, created_at, updated_at
            FROM orb_saved_projects
            WHERE user_id = %s
            ORDER BY updated_at DESC, created_at DESC
            LIMIT %s
            """,
            (user_id, max(1, min(int(limit or 50), 100))),
        )
        return [dict(row) for row in cur.fetchall()]


def save_orb_output(
    conn,
    *,
    user_id: int,
    content: str,
    project_id: int | None = None,
    workflow: str = "ask_orb",
    output_type: str = "answer",
    title: str | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO orb_saved_outputs (
                user_id, project_id, workflow, output_type, title, content, tags, metadata
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, user_id, project_id, workflow, output_type, title, content,
                      tags, metadata, created_at, updated_at
            """,
            (
                user_id,
                project_id,
                workflow,
                output_type,
                title,
                content,
                tags or [],
                Json(metadata or {}),
            ),
        )
        return dict(cur.fetchone())


def list_orb_saved_outputs(conn, *, user_id: int, limit: int = 50) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, user_id, project_id, workflow, output_type, title, content,
                   tags, metadata, created_at, updated_at
            FROM orb_saved_outputs
            WHERE user_id = %s
            ORDER BY updated_at DESC, created_at DESC
            LIMIT %s
            """,
            (user_id, max(1, min(int(limit or 50), 100))),
        )
        return [dict(row) for row in cur.fetchall()]
