from __future__ import annotations

import logging
import os
import time
from typing import Any

from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger("indicare.passkeys")

PASSKEY_CACHE_TTL_SECONDS = int(os.getenv("PASSKEY_CACHE_TTL_SECONDS", "60"))
_PASSKEY_EXISTS_CACHE: dict[int, tuple[float, bool]] = {}
_CACHE_MAX_ENTRIES = int(os.getenv("PASSKEY_CACHE_MAX_ENTRIES", "5000"))


def _now() -> float:
    return time.time()


def _prune_cache() -> None:
    while len(_PASSKEY_EXISTS_CACHE) > _CACHE_MAX_ENTRIES:
        first_key = next(iter(_PASSKEY_EXISTS_CACHE), None)
        if first_key is None:
            break
        _PASSKEY_EXISTS_CACHE.pop(first_key, None)


def _invalidate_user_cache(user_id: int) -> None:
    _PASSKEY_EXISTS_CACHE.pop(int(user_id), None)


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


def init_passkeys_table() -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_passkeys (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    credential_id TEXT NOT NULL UNIQUE,
                    public_key TEXT,
                    credential_public_key TEXT,
                    sign_count BIGINT NOT NULL DEFAULT 0,
                    transports TEXT,
                    aaguid TEXT,
                    nickname TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    last_used_at TIMESTAMPTZ
                )
                """
            )

            cur.execute("ALTER TABLE user_passkeys ADD COLUMN IF NOT EXISTS public_key TEXT")
            cur.execute("ALTER TABLE user_passkeys ADD COLUMN IF NOT EXISTS credential_public_key TEXT")
            cur.execute("ALTER TABLE user_passkeys ADD COLUMN IF NOT EXISTS sign_count BIGINT NOT NULL DEFAULT 0")
            cur.execute("ALTER TABLE user_passkeys ADD COLUMN IF NOT EXISTS transports TEXT")
            cur.execute("ALTER TABLE user_passkeys ADD COLUMN IF NOT EXISTS aaguid TEXT")
            cur.execute("ALTER TABLE user_passkeys ADD COLUMN IF NOT EXISTS nickname TEXT")
            cur.execute("ALTER TABLE user_passkeys ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
            cur.execute("ALTER TABLE user_passkeys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ")
            cur.execute(
                """
                UPDATE user_passkeys
                SET credential_public_key = public_key
                WHERE credential_public_key IS NULL
                  AND public_key IS NOT NULL
                """
            )
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_user_passkeys_credential_id_unique
                ON user_passkeys (credential_id)
                """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_id ON user_passkeys (user_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_user_passkeys_created_at ON user_passkeys (created_at)")

        conn.commit()
    finally:
        release_db_connection(conn)


def user_has_passkeys(user_id: int, conn: Any | None = None) -> bool:
    user_id = int(user_id)
    cached = _PASSKEY_EXISTS_CACHE.get(user_id)
    now = _now()
    if cached and cached[0] > now:
        return cached[1]

    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM user_passkeys
                WHERE user_id = %s
                LIMIT 1
                """,
                (user_id,),
            )
            exists = cur.fetchone() is not None
            _PASSKEY_EXISTS_CACHE[user_id] = (now + PASSKEY_CACHE_TTL_SECONDS, exists)
            _prune_cache()
            return exists
    except Exception:
        _rollback(db_conn)
        logger.warning("Failed checking passkeys for user_id=%s", user_id, exc_info=True)
        return False
    finally:
        _release(db_conn, owned)


def list_user_passkeys(user_id: int, conn: Any | None = None) -> list[dict[str, Any]]:
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    user_id,
                    credential_id,
                    sign_count,
                    transports,
                    aaguid,
                    nickname,
                    created_at,
                    last_used_at
                FROM user_passkeys
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall() or []
            return [dict(row) for row in rows]
    except Exception:
        _rollback(db_conn)
        raise
    finally:
        _release(db_conn, owned)


def get_passkey_by_credential_id(credential_id: str, conn: Any | None = None) -> dict[str, Any] | None:
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    user_id,
                    credential_id,
                    public_key,
                    credential_public_key,
                    sign_count,
                    transports,
                    aaguid,
                    nickname,
                    created_at,
                    last_used_at
                FROM user_passkeys
                WHERE credential_id = %s
                LIMIT 1
                """,
                (credential_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception:
        _rollback(db_conn)
        raise
    finally:
        _release(db_conn, owned)


def create_user_passkey(
    *,
    user_id: int,
    credential_id: str,
    credential_public_key: str,
    sign_count: int = 0,
    transports: str | None = None,
    aaguid: str | None = None,
    nickname: str | None = None,
    conn: Any | None = None,
) -> None:
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_passkeys (
                    user_id,
                    credential_id,
                    public_key,
                    credential_public_key,
                    sign_count,
                    transports,
                    aaguid,
                    nickname,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """,
                (
                    user_id,
                    credential_id,
                    credential_public_key,
                    credential_public_key,
                    int(sign_count),
                    transports,
                    aaguid,
                    nickname,
                ),
            )
        if owned:
            db_conn.commit()
        _invalidate_user_cache(user_id)
    except Exception:
        _rollback(db_conn)
        raise
    finally:
        _release(db_conn, owned)


def update_passkey_sign_count(
    credential_id: str,
    sign_count: int,
    conn: Any | None = None,
) -> None:
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_passkeys
                SET sign_count = %s,
                    last_used_at = NOW()
                WHERE credential_id = %s
                """,
                (int(sign_count), credential_id),
            )
        if owned:
            db_conn.commit()
    except Exception:
        _rollback(db_conn)
        raise
    finally:
        _release(db_conn, owned)


def delete_user_passkey(user_id: int, passkey_id: int, conn: Any | None = None) -> bool:
    db_conn = None
    owned = False
    try:
        db_conn, owned = _acquire(conn)
        with db_conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM user_passkeys
                WHERE id = %s AND user_id = %s
                """,
                (int(passkey_id), int(user_id)),
            )
            deleted = cur.rowcount > 0
        if owned:
            db_conn.commit()
        _invalidate_user_cache(user_id)
        return deleted
    except Exception:
        _rollback(db_conn)
        raise
    finally:
        _release(db_conn, owned)
