from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

HANDOFF_TTL_SECONDS = int(os.getenv("OAUTH_SESSION_HANDOFF_TTL_SECONDS", "300"))

CREATE_HANDOFF_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS orb_oauth_session_handoffs (
    handoff_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    session_token TEXT NOT NULL,
    csrf_token TEXT NOT NULL,
    return_url TEXT NOT NULL,
    mfa_pending BOOLEAN NOT NULL DEFAULT FALSE,
    provider TEXT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_oauth_session_handoffs_expires_at
    ON orb_oauth_session_handoffs (expires_at);
"""

_TABLE_READY = False


def _acquire(optional_conn: Any | None):
    if optional_conn is not None:
        return optional_conn, False
    from db.connection import get_db_connection

    return get_db_connection(), True


def _release(conn: Any | None, owned: bool) -> None:
    if owned and conn is not None:
        from db.connection import release_db_connection

        release_db_connection(conn)


def _rollback(conn: Any | None) -> None:
    if conn is not None and not getattr(conn, "closed", False):
        try:
            conn.rollback()
        except Exception:
            pass


def ensure_handoff_table(conn: Any | None = None) -> None:
    global _TABLE_READY
    if _TABLE_READY:
        return
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor() as cur:
            cur.execute(CREATE_HANDOFF_TABLE_SQL)
        if owned:
            db_conn.commit()
        _TABLE_READY = True
    except Exception:
        _rollback(db_conn)
        logger.warning("Could not initialise orb_oauth_session_handoffs table", exc_info=True)
    finally:
        _release(db_conn, owned)


def store_oauth_session_handoff(
    conn,
    *,
    user_id: int,
    email: str,
    session_token: str,
    csrf_token: str,
    return_url: str,
    mfa_pending: bool = False,
    provider: str | None = None,
) -> str:
    ensure_handoff_table(conn)
    handoff_id = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=HANDOFF_TTL_SECONDS)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO orb_oauth_session_handoffs (
                handoff_id, user_id, email, session_token, csrf_token,
                return_url, mfa_pending, provider, expires_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                handoff_id,
                int(user_id),
                email.strip().lower(),
                session_token,
                csrf_token,
                return_url,
                bool(mfa_pending),
                provider,
                expires_at,
            ),
        )
    return handoff_id


def inspect_oauth_session_handoff(conn, handoff_id: str) -> dict[str, Any] | None:
    """Return handoff metadata without consuming it."""
    ensure_handoff_table(conn)
    token = str(handoff_id or "").strip()
    if not token:
        return None
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT handoff_id, user_id, email, return_url, mfa_pending, provider,
                   expires_at, consumed_at
            FROM orb_oauth_session_handoffs
            WHERE handoff_id = %s
            LIMIT 1
            """,
            (token,),
        )
        row = cur.fetchone()
        if not row:
            return None
        payload = dict(row) if isinstance(row, dict) else {
            "handoff_id": row[0],
            "user_id": row[1],
            "email": row[2],
            "return_url": row[3],
            "mfa_pending": row[4],
            "provider": row[5],
            "expires_at": row[6],
            "consumed_at": row[7],
        }
    expires_at = payload.get("expires_at")
    if expires_at is not None and isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            payload["status"] = "expired"
            return payload
    if payload.get("consumed_at") is not None:
        payload["status"] = "consumed"
        return payload
    payload["status"] = "valid"
    return payload


def consume_oauth_session_handoff(conn, handoff_id: str) -> dict[str, Any] | None:
    ensure_handoff_table(conn)
    token = str(handoff_id or "").strip()
    if not token:
        return None
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT handoff_id, user_id, email, session_token, csrf_token,
                   return_url, mfa_pending, provider, expires_at, consumed_at
            FROM orb_oauth_session_handoffs
            WHERE handoff_id = %s
            LIMIT 1
            """,
            (token,),
        )
        row = cur.fetchone()
        if not row:
            return None
        payload = dict(row) if isinstance(row, dict) else {
            "handoff_id": row[0],
            "user_id": row[1],
            "email": row[2],
            "session_token": row[3],
            "csrf_token": row[4],
            "return_url": row[5],
            "mfa_pending": row[6],
            "provider": row[7],
            "expires_at": row[8],
            "consumed_at": row[9],
        }
        if payload.get("consumed_at") is not None:
            return None
        expires_at = payload.get("expires_at")
        if expires_at is not None:
            if isinstance(expires_at, datetime):
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at <= datetime.now(timezone.utc):
                    return None
        cur.execute(
            """
            UPDATE orb_oauth_session_handoffs
            SET consumed_at = NOW()
            WHERE handoff_id = %s AND consumed_at IS NULL
            """,
            (token,),
        )
        if cur.rowcount <= 0:
            return None
    return payload
