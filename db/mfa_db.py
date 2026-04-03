from __future__ import annotations

import hashlib
import secrets
from typing import Any

from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection, release_db_connection


# ---------------------------------------------------------
# Recovery code helpers
# ---------------------------------------------------------

def hash_recovery_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def generate_recovery_code() -> str:
    return f"{secrets.token_hex(4)}-{secrets.token_hex(4)}".upper()


# ---------------------------------------------------------
# Table init
# ---------------------------------------------------------

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

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_user_mfa_recovery_user
                ON user_mfa_recovery_codes (user_id)
                """
            )

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_user_mfa_recovery_lookup
                ON user_mfa_recovery_codes (user_id, code_hash, is_used)
                """
            )

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

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_auth_audit_user_id
                ON auth_audit_log (user_id)
                """
            )

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_auth_audit_event_type
                ON auth_audit_log (event_type)
                """
            )

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_auth_audit_created_at
                ON auth_audit_log (created_at)
                """
            )

        conn.commit()
    finally:
        release_db_connection(conn)


# ---------------------------------------------------------
# Audit logging
# ---------------------------------------------------------

def log_auth_event(
    *,
    user_id: int | None,
    email: str | None,
    event_type: str,
    ip_address: str | None,
    user_agent: str | None,
    detail: str | None = None,
) -> None:
    conn = get_db_connection()
    try:
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
    finally:
        release_db_connection(conn)


# ---------------------------------------------------------
# MFA core
# ---------------------------------------------------------

def get_user_mfa(user_id: int) -> dict[str, Any] | None:
    """
    Returns MFA row plus all unused recovery codes.
    """
    conn = get_db_connection()
    try:
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
                return None

            cur.execute(
                """
                SELECT code_hash, is_used, used_at, created_at
                FROM user_mfa_recovery_codes
                WHERE user_id = %s
                ORDER BY created_at ASC, id ASC
                """,
                (user_id,),
            )
            recovery_rows = cur.fetchall() or []

            result = dict(row)
            # Route file expects "secret"
            result["secret"] = result.get("totp_secret")
            # Route file expects "recovery_codes"
            # Only unhashed codes can be shown at creation time, so for stored data
            # we expose only metadata count via helper functions. Keep this empty here.
            # The route will use use_recovery_code()/save_recovery_codes().
            result["recovery_codes"] = []
            result["recovery_code_count"] = sum(
                1 for item in recovery_rows if not item.get("is_used")
            )
            return result
    finally:
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
    finally:
        release_db_connection(conn)


def enable_user_mfa(user_id: int, secret: str | None = None) -> None:
    """
    If secret is supplied, store it and enable MFA in one call.
    This makes it compatible with the hardened route file.
    """
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
    finally:
        release_db_connection(conn)


# ---------------------------------------------------------
# Recovery code storage
# ---------------------------------------------------------

def save_recovery_codes(user_id: int, recovery_codes: list[str]) -> list[str]:
    """
    Replaces all recovery codes for a user with a new set.
    Stores only hashes, never plaintext.
    Returns plaintext codes so caller can show them once.
    """
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
        return recovery_codes
    finally:
        release_db_connection(conn)


def replace_recovery_codes(user_id: int, codes: list[str]) -> list[str]:
    """
    Backwards-compatible alias.
    """
    return save_recovery_codes(user_id, codes)


def generate_and_store_recovery_codes(user_id: int, count: int = 8) -> list[str]:
    codes = [generate_recovery_code() for _ in range(count)]
    return save_recovery_codes(user_id, codes)


def count_unused_recovery_codes(user_id: int) -> int:
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
        return True
    finally:
        release_db_connection(conn)
