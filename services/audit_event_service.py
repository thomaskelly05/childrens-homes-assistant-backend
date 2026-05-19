from __future__ import annotations

import json
import logging
import os
import time
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
_TABLE_INIT_ATTEMPTED = False
_HTTP_AUDIT_SAMPLE_RATE = float(os.getenv("HTTP_AUDIT_SAMPLE_RATE", "0"))
_HTTP_AUDIT_ERROR_SAMPLE_RATE = float(os.getenv("HTTP_AUDIT_ERROR_SAMPLE_RATE", "1"))
_AUDIT_FAILURE_LOG_THROTTLE_SECONDS = int(os.getenv("AUDIT_FAILURE_LOG_THROTTLE_SECONDS", "30"))
_LAST_AUDIT_FAILURE_LOG_AT = 0.0
_HIGH_VALUE_EVENT_TYPES = {
    "auth",
    "authentication",
    "login",
    "security",
    "workflow",
    "record",
    "safeguarding",
    "governance",
    "document",
    "mfa",
}


def ensure_audit_table() -> None:
    global _TABLE_READY, _TABLE_INIT_ATTEMPTED
    if _TABLE_READY or _TABLE_INIT_ATTEMPTED:
        return
    _TABLE_INIT_ATTEMPTED = True
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


def _should_sample(rate: float, key: str) -> bool:
    if rate >= 1:
        return True
    if rate <= 0:
        return False
    bucket = abs(hash(key)) % 10000
    return bucket < int(rate * 10000)


def _should_write_audit(event_type: str, action: str, outcome: str, metadata: dict[str, Any] | None) -> bool:
    event_lower = (event_type or "").lower()
    action_lower = (action or "").lower()
    outcome_lower = (outcome or "").lower()

    if any(token in event_lower for token in _HIGH_VALUE_EVENT_TYPES):
        return True
    if outcome_lower not in {"success", "ok", "200"}:
        return _should_sample(_HTTP_AUDIT_ERROR_SAMPLE_RATE, f"{event_type}:{action}:{outcome}")
    if event_lower == "http.request" or action_lower.startswith(("get ", "head ", "options ")):
        return _should_sample(_HTTP_AUDIT_SAMPLE_RATE, f"{event_type}:{action}:{metadata or {}}")
    return True


def _log_audit_failure(event_type: str, action: str) -> None:
    global _LAST_AUDIT_FAILURE_LOG_AT
    now = time.time()
    if now - _LAST_AUDIT_FAILURE_LOG_AT < _AUDIT_FAILURE_LOG_THROTTLE_SECONDS:
        return
    _LAST_AUDIT_FAILURE_LOG_AT = now
    logger.warning("Failed to record audit event type=%s action=%s", event_type, action, exc_info=True)


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

    High-value auth, security, workflow, safeguarding, governance and document
    events are retained. High-volume successful HTTP read audits are sampled by
    default so normal page hydration cannot exhaust the shared database pool.
    """
    if not _should_write_audit(event_type, action, outcome, metadata):
        return

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
        _log_audit_failure(event_type, action)
    finally:
        if conn is not None:
            release_db_connection(conn)
