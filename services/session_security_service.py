from __future__ import annotations

import hashlib
import logging
import secrets
from typing import Any

from fastapi import Request

from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger("indicare.session_security")

CREATE_SESSION_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ NULL,
    revoke_reason TEXT NULL,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    device_fingerprint TEXT NULL,
    trusted_device BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
    passkey_authenticated BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked_at ON user_sessions (revoked_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen_at ON user_sessions (last_seen_at DESC);
"""

_TABLE_READY = False


def ensure_session_table() -> None:
    global _TABLE_READY
    if _TABLE_READY:
        return
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(CREATE_SESSION_TABLE_SQL)
        conn.commit()
        _TABLE_READY = True
    except Exception:
        if conn and not conn.closed:
            conn.rollback()
        logger.warning("Could not initialise user_sessions table", exc_info=True)
    finally:
        if conn is not None:
            release_db_connection(conn)


def _client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _fingerprint(request: Request | None) -> str | None:
    if request is None:
        return None
    raw = "|".join([
        request.headers.get("user-agent", ""),
        request.headers.get("accept-language", ""),
        request.headers.get("sec-ch-ua-platform", ""),
    ])
    if not raw.strip("|"):
        return None
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def create_session_record(
    *,
    user_id: int,
    request: Request | None,
    mfa_verified: bool = False,
    passkey_authenticated: bool = False,
) -> str:
    ensure_session_table()
    session_id = secrets.token_urlsafe(32)
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_sessions (
                    session_id, user_id, ip_address, user_agent, device_fingerprint,
                    mfa_verified, passkey_authenticated
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    session_id,
                    int(user_id),
                    _client_ip(request),
                    request.headers.get("user-agent") if request else None,
                    _fingerprint(request),
                    bool(mfa_verified),
                    bool(passkey_authenticated),
                ),
            )
        conn.commit()
    except Exception:
        if conn and not conn.closed:
            conn.rollback()
        logger.warning("Failed to create session record for user_id=%s", user_id, exc_info=True)
    finally:
        if conn is not None:
            release_db_connection(conn)
    return session_id


def touch_session(session_id: str | None) -> None:
    if not session_id:
        return
    ensure_session_table()
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE user_sessions SET last_seen_at = NOW() WHERE session_id = %s AND revoked_at IS NULL",
                (session_id,),
            )
        conn.commit()
    except Exception:
        if conn and not conn.closed:
            conn.rollback()
        logger.warning("Failed to touch session", exc_info=True)
    finally:
        if conn is not None:
            release_db_connection(conn)


def is_session_revoked(session_id: str | None) -> bool:
    if not session_id:
        return False
    ensure_session_table()
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT revoked_at FROM user_sessions WHERE session_id = %s LIMIT 1", (session_id,))
            row = cur.fetchone()
            if not row:
                return False
            revoked_at = row.get("revoked_at") if isinstance(row, dict) else row[0]
            return revoked_at is not None
    except Exception:
        logger.warning("Failed to check revoked session", exc_info=True)
        return False
    finally:
        if conn is not None:
            release_db_connection(conn)


def revoke_session(session_id: str, reason: str = "revoked") -> bool:
    ensure_session_table()
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_sessions
                SET revoked_at = NOW(), revoke_reason = %s
                WHERE session_id = %s AND revoked_at IS NULL
                """,
                (reason, session_id),
            )
            changed = cur.rowcount > 0
        conn.commit()
        return changed
    except Exception:
        if conn and not conn.closed:
            conn.rollback()
        logger.warning("Failed to revoke session", exc_info=True)
        return False
    finally:
        if conn is not None:
            release_db_connection(conn)


def revoke_user_sessions(user_id: int, *, except_session_id: str | None = None, reason: str = "admin_revoke") -> int:
    ensure_session_table()
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            if except_session_id:
                cur.execute(
                    """
                    UPDATE user_sessions SET revoked_at = NOW(), revoke_reason = %s
                    WHERE user_id = %s AND session_id <> %s AND revoked_at IS NULL
                    """,
                    (reason, int(user_id), except_session_id),
                )
            else:
                cur.execute(
                    """
                    UPDATE user_sessions SET revoked_at = NOW(), revoke_reason = %s
                    WHERE user_id = %s AND revoked_at IS NULL
                    """,
                    (reason, int(user_id)),
                )
            changed = cur.rowcount
        conn.commit()
        return int(changed or 0)
    except Exception:
        if conn and not conn.closed:
            conn.rollback()
        logger.warning("Failed to revoke user sessions", exc_info=True)
        return 0
    finally:
        if conn is not None:
            release_db_connection(conn)


def set_trusted_device(session_id: str, trusted: bool) -> bool:
    if not session_id:
        return False
    ensure_session_table()
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_sessions
                SET trusted_device = %s, last_seen_at = NOW()
                WHERE session_id = %s AND revoked_at IS NULL
                """,
                (bool(trusted), session_id),
            )
            changed = cur.rowcount > 0
        conn.commit()
        return changed
    except Exception:
        if conn and not conn.closed:
            conn.rollback()
        logger.warning("Failed to set trusted device", exc_info=True)
        return False
    finally:
        if conn is not None:
            release_db_connection(conn)


def list_user_sessions(user_id: int) -> list[dict[str, Any]]:
    ensure_session_table()
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT session_id, created_at, last_seen_at, revoked_at, revoke_reason,
                       ip_address, user_agent, trusted_device, mfa_verified, passkey_authenticated
                FROM user_sessions
                WHERE user_id = %s
                ORDER BY last_seen_at DESC
                LIMIT 50
                """,
                (int(user_id),),
            )
            rows = cur.fetchall() or []
            return [dict(row) if isinstance(row, dict) else row for row in rows]
    except Exception:
        logger.warning("Failed to list sessions", exc_info=True)
        return []
    finally:
        if conn is not None:
            release_db_connection(conn)
