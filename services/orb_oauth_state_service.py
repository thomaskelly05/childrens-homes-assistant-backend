from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

STATE_TTL_SECONDS = int(os.getenv("OAUTH_STATE_TTL_SECONDS", "600"))

CREATE_STATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS orb_oauth_states (
    state_token TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    return_url TEXT NOT NULL,
    start_host TEXT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_oauth_states_expires_at
    ON orb_oauth_states (expires_at);
"""

_TABLE_READY = False


class OAuthStateValidationError(ValueError):
    def __init__(self, reason: str, message: str = "invalid_oauth_state") -> None:
        super().__init__(message)
        self.reason = reason


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


def ensure_state_table(conn: Any | None = None) -> None:
    global _TABLE_READY
    if _TABLE_READY:
        return
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor() as cur:
            cur.execute(CREATE_STATE_TABLE_SQL)
        if owned:
            db_conn.commit()
        _TABLE_READY = True
    except Exception:
        _rollback(db_conn)
        logger.warning("Could not initialise orb_oauth_states table", exc_info=True)
    finally:
        _release(db_conn, owned)


def store_oauth_state(
    conn,
    *,
    state_token: str,
    provider: str,
    return_url: str,
    start_host: str | None = None,
) -> None:
    ensure_state_table(conn)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=STATE_TTL_SECONDS)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO orb_oauth_states (
                state_token, provider, return_url, start_host, expires_at
            ) VALUES (%s, %s, %s, %s, %s)
            """,
            (
                state_token,
                provider.strip().lower(),
                return_url,
                start_host,
                expires_at,
            ),
        )


def consume_oauth_state(
    conn,
    *,
    state_token: str,
    provider: str,
) -> dict[str, Any]:
    ensure_state_table(conn)
    token = str(state_token or "").strip()
    if not token:
        raise OAuthStateValidationError("missing_state")

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT state_token, provider, return_url, start_host, expires_at, consumed_at
            FROM orb_oauth_states
            WHERE state_token = %s
            LIMIT 1
            """,
            (token,),
        )
        row = cur.fetchone()
        if not row:
            raise OAuthStateValidationError("missing_state")

        payload = dict(row) if isinstance(row, dict) else {
            "state_token": row[0],
            "provider": row[1],
            "return_url": row[2],
            "start_host": row[3],
            "expires_at": row[4],
            "consumed_at": row[5],
        }

        if payload.get("consumed_at") is not None:
            raise OAuthStateValidationError("consumed_state")

        expires_at = payload.get("expires_at")
        if expires_at is not None:
            if isinstance(expires_at, datetime):
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at <= datetime.now(timezone.utc):
                    raise OAuthStateValidationError("expired_state")

        stored_provider = str(payload.get("provider") or "").strip().lower()
        if stored_provider != provider.strip().lower():
            raise OAuthStateValidationError("unknown")

        cur.execute(
            """
            UPDATE orb_oauth_states
            SET consumed_at = NOW()
            WHERE state_token = %s AND consumed_at IS NULL
            """,
            (token,),
        )
        if cur.rowcount <= 0:
            raise OAuthStateValidationError("consumed_state")

    return payload
