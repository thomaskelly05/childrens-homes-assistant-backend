"""
© 2026 IndiCare. All rights reserved.

Backend storage for legal / terms acceptance.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any, Optional

# Adjust this path only if your main DB lives somewhere else.
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "indicare.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_legal_acceptance_table() -> None:
    conn = get_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS legal_acceptances (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                email TEXT,
                legal_version TEXT NOT NULL,
                accepted_at TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_id
            ON legal_acceptances (user_id)
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_version
            ON legal_acceptances (user_id, legal_version)
            """
        )
        conn.commit()
    finally:
        conn.close()


def record_legal_acceptance(
    *,
    user_id: int,
    email: Optional[str],
    legal_version: str,
    accepted_at: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> int:
    conn = get_connection()
    try:
        existing = conn.execute(
            """
            SELECT id
            FROM legal_acceptances
            WHERE user_id = ? AND legal_version = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (user_id, legal_version),
        ).fetchone()

        if existing:
            return int(existing["id"])

        cur = conn.execute(
            """
            INSERT INTO legal_acceptances (
                user_id,
                email,
                legal_version,
                accepted_at,
                ip_address,
                user_agent
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                email,
                legal_version,
                accepted_at,
                ip_address,
                user_agent,
            ),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def get_latest_legal_acceptance_for_user(user_id: int) -> Optional[dict[str, Any]]:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT id, user_id, email, legal_version, accepted_at, ip_address, user_agent, created_at
            FROM legal_acceptances
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()

        if not row:
            return None

        return dict(row)
    finally:
        conn.close()


def has_user_accepted_version(user_id: int, legal_version: str) -> bool:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT 1
            FROM legal_acceptances
            WHERE user_id = ? AND legal_version = ?
            LIMIT 1
            """,
            (user_id, legal_version),
        ).fetchone()
        return row is not None
    finally:
        conn.close()
