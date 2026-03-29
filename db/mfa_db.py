from __future__ import annotations

import hashlib
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "indicare.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_recovery_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def generate_recovery_code() -> str:
    return f"{secrets.token_hex(4)}-{secrets.token_hex(4)}".upper()


def init_mfa_tables() -> None:
    conn = get_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_mfa (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                email TEXT,
                totp_secret TEXT NOT NULL,
                is_enabled INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                enabled_at TEXT,
                last_verified_at TEXT
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_mfa_recovery_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                code_hash TEXT NOT NULL,
                is_used INTEGER NOT NULL DEFAULT 0,
                used_at TEXT,
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_user_mfa_recovery_user
            ON user_mfa_recovery_codes (user_id)
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                email TEXT,
                event_type TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                detail TEXT,
                created_at TEXT NOT NULL
            )
            """
        )

        conn.commit()
    finally:
        conn.close()


def log_auth_event(
    *,
    user_id: int | None,
    email: str | None,
    event_type: str,
    ip_address: str | None,
    user_agent: str | None,
    detail: str | None = None,
) -> None:
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO auth_audit_log (
                user_id, email, event_type, ip_address, user_agent, detail, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, email, event_type, ip_address, user_agent, detail, utc_now_iso()),
        )
        conn.commit()
    finally:
        conn.close()


def get_user_mfa(user_id: int) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT id, user_id, email, totp_secret, is_enabled, created_at, enabled_at, last_verified_at
            FROM user_mfa
            WHERE user_id = ?
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def upsert_user_mfa_secret(user_id: int, email: str | None, totp_secret: str) -> None:
    existing = get_user_mfa(user_id)
    conn = get_connection()
    try:
        if existing:
            conn.execute(
                """
                UPDATE user_mfa
                SET totp_secret = ?, email = ?, is_enabled = 0, enabled_at = NULL
                WHERE user_id = ?
                """,
                (totp_secret, email, user_id),
            )
        else:
            conn.execute(
                """
                INSERT INTO user_mfa (
                    user_id, email, totp_secret, is_enabled, created_at
                )
                VALUES (?, ?, ?, 0, ?)
                """,
                (user_id, email, totp_secret, utc_now_iso()),
            )
        conn.commit()
    finally:
        conn.close()


def enable_user_mfa(user_id: int) -> None:
    conn = get_connection()
    try:
        conn.execute(
            """
            UPDATE user_mfa
            SET is_enabled = 1, enabled_at = ?
            WHERE user_id = ?
            """,
            (utc_now_iso(), user_id),
        )
        conn.commit()
    finally:
        conn.close()


def update_last_verified(user_id: int) -> None:
    conn = get_connection()
    try:
        conn.execute(
            """
            UPDATE user_mfa
            SET last_verified_at = ?
            WHERE user_id = ?
            """,
            (utc_now_iso(), user_id),
        )
        conn.commit()
    finally:
        conn.close()


def replace_recovery_codes(user_id: int, codes: list[str]) -> list[str]:
    conn = get_connection()
    try:
        conn.execute("DELETE FROM user_mfa_recovery_codes WHERE user_id = ?", (user_id,))
        for code in codes:
            conn.execute(
                """
                INSERT INTO user_mfa_recovery_codes (
                    user_id, code_hash, is_used, created_at
                )
                VALUES (?, ?, 0, ?)
                """,
                (user_id, hash_recovery_code(code), utc_now_iso()),
            )
        conn.commit()
        return codes
    finally:
        conn.close()


def generate_and_store_recovery_codes(user_id: int, count: int = 8) -> list[str]:
    codes = [generate_recovery_code() for _ in range(count)]
    return replace_recovery_codes(user_id, codes)


def count_unused_recovery_codes(user_id: int) -> int:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT COUNT(*) AS c
            FROM user_mfa_recovery_codes
            WHERE user_id = ? AND is_used = 0
            """,
            (user_id,),
        ).fetchone()
        return int(row["c"]) if row else 0
    finally:
        conn.close()


def use_recovery_code(user_id: int, code: str) -> bool:
    code_hash = hash_recovery_code(code)
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT id
            FROM user_mfa_recovery_codes
            WHERE user_id = ? AND code_hash = ? AND is_used = 0
            LIMIT 1
            """,
            (user_id, code_hash),
        ).fetchone()

        if not row:
            return False

        conn.execute(
            """
            UPDATE user_mfa_recovery_codes
            SET is_used = 1, used_at = ?
            WHERE id = ?
            """,
            (utc_now_iso(), row["id"]),
        )
        conn.commit()
        return True
    finally:
        conn.close()
