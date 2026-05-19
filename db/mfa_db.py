from __future__ import annotations

import hashlib
import logging
import os
import secrets
import time
from typing import Any

from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger("indicare.mfa")

MFA_CACHE_TTL_SECONDS = int(os.getenv("MFA_CACHE_TTL_SECONDS", "45"))
_MFA_CACHE: dict[int, tuple[float, dict[str, Any] | None]] = {}
_MFA_CACHE_MAX_ENTRIES = int(os.getenv("MFA_CACHE_MAX_ENTRIES", "5000"))


def _now() -> float:
    return time.time()


def _prune_mfa_cache() -> None:
    while len(_MFA_CACHE) > _MFA_CACHE_MAX_ENTRIES:
        first_key = next(iter(_MFA_CACHE), None)
        if first_key is None:
            break
        _MFA_CACHE.pop(first_key, None)


def _invalidate_mfa_cache(user_id: int) -> None:
    _MFA_CACHE.pop(int(user_id), None)


def hash_recovery_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def generate_recovery_code() -> str:
    return f"{secrets.token_hex(4)}-{secrets.token_hex(4)}".upper()


def init_mfa_tables() -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_mfa (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL UNIQUE,
                    email TEXT,
                    totp_secret TEXT NOT NULL,
                    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    enabled_at TIMESTAMPTZ,
                    last_verified_at TIMESTAMPTZ
                )
                """
            )
            cur.execute("ALTER TABLE user_mfa ADD COLUMN IF NOT EXISTS email TEXT")
            cur.execute("ALTER TABLE user_mfa ADD COLUMN IF NOT EXISTS totp_secret TEXT")
            cur.execute("ALTER TABLE user_mfa ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT FALSE")
            cur.execute("ALTER TABLE user_mfa ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
            cur.execute("ALTER TABLE user_mfa ADD COLUMN IF NOT EXISTS enabled_at TIMESTAMPTZ")
            cur.execute("ALTER TABLE user_mfa ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ")
            cur.execute("UPDATE user_mfa SET totp_secret = COALESCE(totp_secret, '') WHERE totp_secret IS NULL")
            cur.execute("DELETE FROM user_mfa a USING user_mfa b WHERE a.user_id = b.user_id AND a.id < b.id")
            cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_user_mfa_user_id_unique ON user_mfa (user_id)")

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_mfa_recovery_codes (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    code_hash TEXT NOT NULL,
                    is_used BOOLEAN NOT NULL DEFAULT FALSE,
                    used_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute("ALTER TABLE user_mfa_recovery_codes ADD COLUMN IF NOT EXISTS code_hash TEXT")
            cur.execute("ALTER TABLE user_mfa_recovery_codes ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT FALSE")
            cur.execute("ALTER TABLE user_mfa_recovery_codes ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ")
            cur.execute("ALTER TABLE user_mfa_recovery_codes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_user_mfa_recovery_user ON user_mfa_recovery_codes (user_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_user_mfa_recovery_lookup ON user_mfa_recovery_codes (user_id, code_hash, is_used)")

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS auth_audit_log (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER,
                    email TEXT,
                    event_type TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    detail TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute("ALTER TABLE auth_audit_log ADD COLUMN IF NOT EXISTS user_id INTEGER")
            cur.execute("ALTER TABLE auth_audit_log ADD COLUMN IF NOT EXISTS email TEXT")
            cur.execute("ALTER TABLE auth_audit_log ADD COLUMN IF NOT EXISTS event_type TEXT")
            cur.execute("ALTER TABLE auth_audit_log ADD COLUMN IF NOT EXISTS ip_address TEXT")
            cur.execute("ALTER TABLE auth_audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT")
            cur.execute("ALTER TABLE auth_audit_log ADD COLUMN IF NOT EXISTS detail TEXT")
            cur.execute("ALTER TABLE auth_audit_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
            cur.execute("UPDATE auth_audit_log SET event_type = COALESCE(event_type, 'legacy_event') WHERE event_type IS NULL")
            cur.execute("ALTER TABLE auth_audit_log ALTER COLUMN event_type SET NOT NULL")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_auth_audit_user_id ON auth_audit_log (user_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_auth_audit_event_type ON auth_audit_log (event_type)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_auth_audit_created_at ON auth_audit_log (created_at)")

        conn.commit()
    finally:
        release_db_connection(conn)


def log_auth_event(
    *,
    user_id: int | None,
    email: str | None,
    event_type: str,
    ip_address: str | None,
    user_agent: str | None,
    detail: str | None = None,
) -> None:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO auth_audit_log (
                    user_id,
                    email,
                    event_type,
                    ip_address,
                    user_agent,
                    detail,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                """,
                (user_id, email, event_type, ip_address, user_agent, detail),
            )
        conn.commit()
    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        logger.warning("Failed to record auth event type=%s", event_type, exc_info=True)
    finally:
        if conn is not None:
            release_db_connection(conn)


def get_user_mfa(user_id: int) -> dict[str, Any] | None:
    user_id = int(user_id)
    cached = _MFA_CACHE.get(user_id)
    now = _now()
    if cached and cached[0] > now:
        return cached[1]

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    user_id,
                    email,
                    totp_secret,
                    is_enabled,
                    created_at,
                    enabled_at,
                    last_verified_at
                FROM user_mfa
                WHERE user_id = %s
                LIMIT 1
                """,
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                _MFA_CACHE[user_id] = (now + MFA_CACHE_TTL_SECONDS, None)
                _prune_mfa_cache()
                return None

            result = dict(row)
            result["secret"] = result.get("totp_secret")

            cur.execute(
                """
                SELECT COUNT(*) AS c
                FROM user_mfa_recovery_codes
                WHERE user_id = %s
                  AND is_used = FALSE
                """,
                (user_id,),
            )
            count_row = cur.fetchone()
            result["recovery_codes"] = []
            result["recovery_code_count"] = int(count_row["c"]) if count_row else 0
            _MFA_CACHE[user_id] = (now + MFA_CACHE_TTL_SECONDS, result)
            _prune_mfa_cache()
            return result
    except Exception:
        logger.warning("Failed to load MFA state for user_id=%s", user_id, exc_info=True)
        return None
    finally:
        if conn is not None:
            release_db_connection(conn)


def upsert_user_mfa_secret(user_id: int, email: str | None, totp_secret: str) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_mfa (
                    user_id,
                    email,
                    totp_secret,
                    is_enabled,
                    created_at,
                    enabled_at,
                    last_verified_at
                )
                VALUES (%s, %s, %s, FALSE, NOW(), NULL, NULL)
                ON CONFLICT (user_id)
                DO UPDATE SET
                    email = EXCLUDED.email,
                    totp_secret = EXCLUDED.totp_secret,
                    is_enabled = FALSE,
                    enabled_at = NULL,
                    last_verified_at = NULL
                """,
                (user_id, email, totp_secret),
            )
        conn.commit()
        _invalidate_mfa_cache(user_id)
    finally:
        release_db_connection(conn)


def enable_user_mfa(user_id: int, secret: str | None = None) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if secret:
                cur.execute(
                    """
                    INSERT INTO user_mfa (
                        user_id,
                        totp_secret,
                        is_enabled,
                        created_at,
                        enabled_at
                    )
                    VALUES (%s, %s, TRUE, NOW(), NOW())
                    ON CONFLICT (user_id)
                    DO UPDATE SET
                        totp_secret = EXCLUDED.totp_secret,
                        is_enabled = TRUE,
                        enabled_at = NOW()
                    """,
                    (user_id, secret),
                )
            else:
                cur.execute(
                    """
                    UPDATE user_mfa
                    SET is_enabled = TRUE,
                        enabled_at = NOW()
                    WHERE user_id = %s
                    """,
                    (user_id,),
                )
        conn.commit()
        _invalidate_mfa_cache(user_id)
    finally:
        release_db_connection(conn)


def disable_user_mfa(user_id: int) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_mfa
                SET is_enabled = FALSE
                WHERE user_id = %s
                """,
                (user_id,),
            )
            cur.execute(
                """
                DELETE FROM user_mfa_recovery_codes
                WHERE user_id = %s
                """,
                (user_id,),
            )
        conn.commit()
        _invalidate_mfa_cache(user_id)
    finally:
        release_db_connection(conn)


def update_last_verified(user_id: int) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_mfa
                SET last_verified_at = NOW()
                WHERE user_id = %s
                """,
                (user_id,),
            )
        conn.commit()
        _invalidate_mfa_cache(user_id)
    finally:
        release_db_connection(conn)


def save_recovery_codes(user_id: int, recovery_codes: list[str]) -> list[str]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM user_mfa_recovery_codes
                WHERE user_id = %s
                """,
                (user_id,),
            )

            for code in recovery_codes:
                cur.execute(
                    """
                    INSERT INTO user_mfa_recovery_codes (
                        user_id,
                        code_hash,
                        is_used,
                        created_at
                    )
                    VALUES (%s, %s, FALSE, NOW())
                    """,
                    (user_id, hash_recovery_code(code)),
                )

        conn.commit()
        _invalidate_mfa_cache(user_id)
        return recovery_codes
    finally:
        release_db_connection(conn)


def replace_recovery_codes(user_id: int, codes: list[str]) -> list[str]:
    return save_recovery_codes(user_id, codes)


def generate_and_store_recovery_codes(user_id: int, count: int = 8) -> list[str]:
    codes = [generate_recovery_code() for _ in range(count)]
    return save_recovery_codes(user_id, codes)


def count_unused_recovery_codes(user_id: int) -> int:
    cached = get_user_mfa(user_id)
    if cached is not None and "recovery_code_count" in cached:
        return int(cached.get("recovery_code_count") or 0)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT COUNT(*) AS c
                FROM user_mfa_recovery_codes
                WHERE user_id = %s
                  AND is_used = FALSE
                """,
                (user_id,),
            )
            row = cur.fetchone()
            return int(row["c"]) if row else 0
    finally:
        release_db_connection(conn)


def use_recovery_code(user_id: int, code: str) -> bool:
    code_hash = hash_recovery_code(code)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id
                FROM user_mfa_recovery_codes
                WHERE user_id = %s
                  AND code_hash = %s
                  AND is_used = FALSE
                LIMIT 1
                """,
                (user_id, code_hash),
            )
            row = cur.fetchone()

            if not row:
                return False

            cur.execute(
                """
                UPDATE user_mfa_recovery_codes
                SET is_used = TRUE,
                    used_at = NOW()
                WHERE id = %s
                """,
                (row["id"],),
            )

        conn.commit()
        _invalidate_mfa_cache(user_id)
        return True
    finally:
        release_db_connection(conn)
