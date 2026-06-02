from __future__ import annotations

import logging
from typing import Any

from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


def _has_table_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return "orb_usage_preferences" in text or "orb_usage_credits" in text or "does not exist" in text


def get_orb_usage_preferences(conn, *, user_id: int) -> dict[str, Any] | None:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT user_id, monthly_cap_pence, warning_threshold_percent, allow_overage,
                       created_at, updated_at
                FROM orb_usage_preferences
                WHERE user_id = %s
                LIMIT 1
                """,
                (user_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        if _has_table_error(exc):
            logger.debug("orb_usage_preferences unavailable", exc_info=True)
            return None
        raise


def upsert_orb_usage_preferences(
    conn,
    *,
    user_id: int,
    monthly_cap_pence: int | None,
    warning_threshold_percent: int,
    allow_overage: bool,
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO orb_usage_preferences (
                user_id, monthly_cap_pence, warning_threshold_percent, allow_overage
            )
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_id) DO UPDATE SET
                monthly_cap_pence = EXCLUDED.monthly_cap_pence,
                warning_threshold_percent = EXCLUDED.warning_threshold_percent,
                allow_overage = EXCLUDED.allow_overage,
                updated_at = NOW()
            RETURNING user_id, monthly_cap_pence, warning_threshold_percent, allow_overage,
                      created_at, updated_at
            """,
            (user_id, monthly_cap_pence, warning_threshold_percent, allow_overage),
        )
        return dict(cur.fetchone())


def sum_orb_usage_credits_balance(conn, *, user_id: int) -> int:
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COALESCE(SUM(credits), 0)
                FROM orb_usage_credits
                WHERE user_id = %s AND status = 'completed'
                """,
                (user_id,),
            )
            row = cur.fetchone()
            return int(row[0] if row else 0)
    except Exception as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        if _has_table_error(exc):
            return 0
        raise


def record_orb_usage_credit_purchase(
    conn,
    *,
    user_id: int,
    stripe_checkout_session_id: str,
    amount_pence: int,
    credits: int | None = None,
    status: str = "completed",
) -> dict[str, Any]:
    resolved_credits = credits if credits is not None else amount_pence
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO orb_usage_credits (
                user_id, stripe_checkout_session_id, amount_pence, credits, status
            )
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (stripe_checkout_session_id) DO UPDATE SET
                status = EXCLUDED.status,
                credits = EXCLUDED.credits,
                updated_at = NOW()
            RETURNING id, user_id, stripe_checkout_session_id, amount_pence, credits, status,
                      created_at, updated_at
            """,
            (user_id, stripe_checkout_session_id, amount_pence, resolved_credits, status),
        )
        return dict(cur.fetchone())
