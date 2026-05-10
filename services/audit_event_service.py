from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import Request

from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger("indicare.audit")

CREATE_AUDIT_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS audit_events (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL,
    actor_user_id INTEGER NULL,
    actor_email TEXT NULL,
    actor_role TEXT NULL,
    home_id INTEGER NULL,
    provider_id INTEGER NULL,
    resource_type TEXT NULL,
    resource_id TEXT NULL,
    action TEXT NOT NULL,
    outcome TEXT NOT NULL DEFAULT 'success',
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    request_id TEXT NULL,
    path TEXT NULL,
    method TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_user_id ON audit_events (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_home_id ON audit_events (home_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_provider_id ON audit_events (provider_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events (event_type);
"""

_TABLE_READY = False


def ensure_audit_table() -> None:
    global _TABLE_READY
    if _TABLE_READY:
        return
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(CREATE_AUDIT_TABLE_SQL)
        conn.commit()
        _TABLE_READY = True
    except Exception:
        if conn and not conn.closed:
            conn.rollback()
        logger.warning("Could not initialise audit_events table", exc_info=True)
    finally:
        if conn is not None:
            release_db_connection(conn)


def _safe_json(metadata: dict[str, Any] | None) -> str:
    try:
        return json.dumps(metadata or {}, default=str)
    except Exception:
        return "{}"


def _client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def record_audit_event(
    *,
    event_type: str,
    action: str,
    outcome: str = "success",
    request: Request | None = None,
    actor: dict[str, Any] | None = None,
    resource_type: str | None = None,
    resource_id: str | int | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Best-effort append-only audit logging.

    This must never block the user journey. Failures are written to application logs
    and can be monitored, but request handling continues.
    """
    ensure_audit_table()

    actor = actor or {}
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO audit_events (
                    event_type, actor_user_id, actor_email, actor_role, home_id,
                    provider_id, resource_type, resource_id, action, outcome,
                    ip_address, user_agent, request_id, path, method, metadata
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s::jsonb
                )
                """,
                (
                    event_type,
                    actor.get("id") or actor.get("user_id"),
                    actor.get("email"),
                    actor.get("role"),
                    actor.get("home_id") or actor.get("homeId"),
                    actor.get("provider_id") or actor.get("providerId"),
                    resource_type,
                    str(resource_id) if resource_id is not None else None,
                    action,
                    outcome,
                    _client_ip(request),
                    request.headers.get("user-agent") if request else None,
                    getattr(request.state, "request_id", None) if request else None,
                    request.url.path if request else None,
                    request.method if request else None,
                    _safe_json(metadata),
                ),
            )
        conn.commit()
    except Exception:
        if conn and not conn.closed:
            conn.rollback()
        logger.warning("Failed to record audit event type=%s action=%s", event_type, action, exc_info=True)
    finally:
        if conn is not None:
            release_db_connection(conn)
