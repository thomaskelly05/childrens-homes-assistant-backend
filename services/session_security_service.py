from __future__ import annotations

import hashlib
import logging
import os
import secrets
import time
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
SESSION_REVOKED_CACHE_TTL_SECONDS = int(os.getenv("SESSION_REVOKED_CACHE_TTL_SECONDS", "30"))
SESSION_TOUCH_THROTTLE_SECONDS = int(os.getenv("SESSION_TOUCH_THROTTLE_SECONDS", "300"))
_SESSION_REVOKED_CACHE: dict[str, tuple[float, bool]] = {}
_SESSION_TOUCH_CACHE: dict[str, float] = {}
_CACHE_MAX_ENTRIES = int(os.getenv("SESSION_SECURITY_CACHE_MAX_ENTRIES", "5000"))


def _now() -> float:
    return time.time()


def _prune_cache(cache: dict[str, Any], *, max_entries: int = _CACHE_MAX_ENTRIES) -> None:
    if len(cache) <= max_entries:
        return
    for key in list(cache.keys())[: max(1, len(cache) - max_entries)]:
        cache.pop(key, None)


def _acquire(optional_conn: Any | None):
    if optional_conn is not None:
        return optional_conn, False
    return get_db_connection(), True


def _release(conn: Any | None, owned: bool) -> None:
    if owned and conn is not None:
        release_db_connection(conn)


def _rollback(conn: Any | None) -> None:
    if conn is not None and not getattr(conn, "closed", False):
        try:
            conn.rollback()
        except Exception:
            pass


def ensure_session_table(conn: Any | None = None) -> None:
    global _TABLE_READY
    if _TABLE_READY:
        return
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor() as cur:
            cur.execute(CREATE_SESSION_TABLE_SQL)
        if owned:
            db_conn.commit()
        _TABLE_READY = True
    except Exception:
        _rollback(db_conn)
        logger.warning("Could not initialise user_sessions table", exc_info=True)
    finally:
        _release(db_conn, owned)


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
    conn: Any | None = None,
) -> str:
    ensure_session_table(conn)
    session_id = secrets.token_urlsafe(32)
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor() as cur:
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
        if owned:
            db_conn.commit()
        _SESSION_REVOKED_CACHE[session_id] = (_now() + SESSION_REVOKED_CACHE_TTL_SECONDS, False)
        _SESSION_TOUCH_CACHE[session_id] = _now()
    except Exception:
        _rollback(db_conn)
        logger.warning("Failed to create session record for user_id=%s", user_id, exc_info=True)
    finally:
        _release(db_conn, owned)
    return session_id


def touch_session(session_id: str | None, conn: Any | None = None) -> None:
    if not session_id:
        return
    now = _now()
    last_touch = _SESSION_TOUCH_CACHE.get(session_id)
    if last_touch and now - last_touch < SESSION_TOUCH_THROTTLE_SECONDS:
        return
    _SESSION_TOUCH_CACHE[session_id] = now
    _prune_cache(_SESSION_TOUCH_CACHE)
    ensure_session_table(conn)
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor() as cur:
            cur.execute(
                "UPDATE user_sessions SET last_seen_at = NOW() WHERE session_id = %s AND revoked_at IS NULL",
                (session_id,),
            )
        if owned:
            db_conn.commit()
    except Exception:
        _rollback(db_conn)
        logger.warning("Failed to touch session", exc_info=True)
    finally:
        _release(db_conn, owned)


def is_session_revoked(session_id: str | None, conn: Any | None = None) -> bool:
    if not session_id:
        return False
    now = _now()
    cached = _SESSION_REVOKED_CACHE.get(session_id)
    if cached and cached[0] > now:
        return cached[1]
    ensure_session_table(conn)
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor() as cur:
            cur.execute("SELECT revoked_at FROM user_sessions WHERE session_id = %s LIMIT 1", (session_id,))
            row = cur.fetchone()
            if not row:
                _SESSION_REVOKED_CACHE[session_id] = (now + SESSION_REVOKED_CACHE_TTL_SECONDS, False)
                _prune_cache(_SESSION_REVOKED_CACHE)
                return False
            revoked_at = row.get("revoked_at") if isinstance(row, dict) else row[0]
            is_revoked = revoked_at is not None
            _SESSION_REVOKED_CACHE[session_id] = (now + SESSION_REVOKED_CACHE_TTL_SECONDS, is_revoked)
            _prune_cache(_SESSION_REVOKED_CACHE)
            return is_revoked
    except Exception:
        _rollback(db_conn)
        logger.warning("Failed to check revoked session", exc_info=True)
        return False
    finally:
        _release(db_conn, owned)


def revoke_session(session_id: str, reason: str = "revoked", conn: Any | None = None) -> bool:
    ensure_session_table(conn)
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_sessions
                SET revoked_at = NOW(), revoke_reason = %s
                WHERE session_id = %s AND revoked_at IS NULL
                """,
                (reason, session_id),
            )
            changed = cur.rowcount > 0
        if owned:
            db_conn.commit()
        _SESSION_REVOKED_CACHE[session_id] = (_now() + SESSION_REVOKED_CACHE_TTL_SECONDS, True)
        _SESSION_TOUCH_CACHE.pop(session_id, None)
        return changed
    except Exception:
        _rollback(db_conn)
        logger.warning("Failed to revoke session", exc_info=True)
        return False
    finally:
        _release(db_conn, owned)


def revoke_user_sessions(user_id: int, *, except_session_id: str | None = None, reason: str = "admin_revoke", conn: Any | None = None) -> int:
    ensure_session_table(conn)
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor() as cur:
            if except_session_id:
                cur.execute(
                    """
                    UPDATE user_sessions SET revoked_at = NOW(), revoke_reason = %s
                    WHERE user_id = %s AND session_id <> %s AND revoked_at IS NULL
                    RETURNING session_id
                    """,
                    (reason, int(user_id), except_session_id),
                )
            else:
                cur.execute(
                    """
                    UPDATE user_sessions SET revoked_at = NOW(), revoke_reason = %s
                    WHERE user_id = %s AND revoked_at IS NULL
                    RETURNING session_id
                    """,
                    (reason, int(user_id)),
                )
            rows = cur.fetchall() or []
            changed = len(rows)
        if owned:
            db_conn.commit()
        for row in rows:
            sid = row.get("session_id") if isinstance(row, dict) else row[0]
            if sid:
                _SESSION_REVOKED_CACHE[str(sid)] = (_now() + SESSION_REVOKED_CACHE_TTL_SECONDS, True)
                _SESSION_TOUCH_CACHE.pop(str(sid), None)
        return int(changed or 0)
    except Exception:
        _rollback(db_conn)
        logger.warning("Failed to revoke user sessions", exc_info=True)
        return 0
    finally:
        _release(db_conn, owned)


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
        _SESSION_TOUCH_CACHE[session_id] = _now()
        return changed
    except Exception:
        if conn and not conn.closed:
            conn.rollback()
        logger.warning("Failed to set trusted device", exc_info=True)
        return False
    finally:
        if conn is not None:
            release_db_connection(conn)


def list_user_sessions(user_id: int, conn: Any | None = None) -> list[dict[str, Any]]:
    ensure_session_table(conn)
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor() as cur:
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
        _rollback(db_conn)
        logger.warning("Failed to list sessions", exc_info=True)
        return []
    finally:
        _release(db_conn, owned)
