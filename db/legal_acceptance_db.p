"""
© 2026 IndiCare. All rights reserved.

Backend storage for legal / terms acceptance.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger(__name__)


def init_legal_acceptance_table() -> None:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS legal_acceptances (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    email TEXT,
                    legal_version TEXT NOT NULL,
                    accepted_at TIMESTAMPTZ NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_id
                ON legal_acceptances (user_id)
                """
            )

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_version
                ON legal_acceptances (user_id, legal_version)
                """
            )

        conn.commit()
        logger.info("legal_acceptances table ready")
    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        logger.exception("Failed to initialise legal_acceptances table")
        raise
    finally:
        release_db_connection(conn)


def record_legal_acceptance(
    *,
    user_id: int,
    email: Optional[str],
    legal_version: str,
    accepted_at: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> int:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM legal_acceptances
                WHERE user_id = %s AND legal_version = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (user_id, legal_version),
            )
            existing = cur.fetchone()

            if existing:
                conn.commit()
                return int(existing["id"])

            cur.execute(
                """
                INSERT INTO legal_acceptances (
                    user_id,
                    email,
                    legal_version,
                    accepted_at,
                    ip_address,
                    user_agent
                )
                VALUES (%s, %s, %s, %s::timestamptz, %s, %s)
                RETURNING id
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
            row = cur.fetchone()

        conn.commit()
        return int(row["id"])
    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        logger.exception("Failed to record legal acceptance")
        raise
    finally:
        release_db_connection(conn)


def get_latest_legal_acceptance_for_user(user_id: int) -> Optional[dict[str, Any]]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    user_id,
                    email,
                    legal_version,
                    accepted_at,
                    ip_address,
                    user_agent,
                    created_at
                FROM legal_acceptances
                WHERE user_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (user_id,),
            )
            row = cur.fetchone()

        conn.commit()

        if not row:
            return None

        return dict(row)
    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        logger.exception("Failed to fetch latest legal acceptance")
        raise
    finally:
        release_db_connection(conn)


def has_user_accepted_version(user_id: int, legal_version: str) -> bool:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM legal_acceptances
                WHERE user_id = %s AND legal_version = %s
                LIMIT 1
                """,
                (user_id, legal_version),
            )
            row = cur.fetchone()

        conn.commit()
        return row is not None
    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        logger.exception("Failed to check legal acceptance version")
        raise
    finally:
        release_db_connection(conn)
