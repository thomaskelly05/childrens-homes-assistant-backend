from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import psycopg2
from psycopg2.extras import Json, RealDictCursor

logger = logging.getLogger(__name__)

ORB_SAFETY_ACCEPTANCE_VERSION = "2026-05-29-v1"


def _row(row) -> dict[str, Any] | None:
    return dict(row) if row else None


def _has_table_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return (
        isinstance(exc, (psycopg2.errors.UndefinedTable, psycopg2.errors.UndefinedColumn))
        or "orb_subscriptions" in text
        or "orb_safety_acceptances" in text
        or "does not exist" in text
    )


def _safe_rollback(conn) -> None:
    try:
        conn.rollback()
    except Exception:
        logger.debug("Could not rollback ORB subscription transaction", exc_info=True)


def get_orb_subscription(conn, user_id: int) -> dict[str, Any] | None:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    user_id,
                    stripe_customer_id,
                    stripe_subscription_id,
                    stripe_price_id,
                    orb_plan,
                    subscription_status,
                    current_period_start,
                    current_period_end,
                    cancel_at_period_end,
                    payment_failed_at,
                    created_at,
                    updated_at
                FROM orb_subscriptions
                WHERE user_id = %s
                LIMIT 1
                """,
                (user_id,),
            )
            return _row(cur.fetchone())
    except Exception as exc:
        if not _has_table_error(exc):
            raise
        _safe_rollback(conn)
        return None


def get_orb_subscription_by_customer_id(conn, stripe_customer_id: str) -> dict[str, Any] | None:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    user_id,
                    stripe_customer_id,
                    stripe_subscription_id,
                    stripe_price_id,
                    orb_plan,
                    subscription_status,
                    current_period_start,
                    current_period_end,
                    cancel_at_period_end,
                    payment_failed_at,
                    created_at,
                    updated_at
                FROM orb_subscriptions
                WHERE stripe_customer_id = %s
                LIMIT 1
                """,
                (stripe_customer_id.strip(),),
            )
            return _row(cur.fetchone())
    except Exception as exc:
        if not _has_table_error(exc):
            raise
        _safe_rollback(conn)
        return None


def upsert_orb_stripe_customer(conn, *, user_id: int, stripe_customer_id: str) -> dict[str, Any]:
    customer_id = stripe_customer_id.strip()
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO orb_subscriptions (user_id, stripe_customer_id)
            VALUES (%s, %s)
            ON CONFLICT (user_id) DO UPDATE SET
                stripe_customer_id = EXCLUDED.stripe_customer_id,
                updated_at = NOW()
            RETURNING
                id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
                orb_plan, subscription_status, current_period_start, current_period_end,
                cancel_at_period_end, payment_failed_at, created_at, updated_at
            """,
            (user_id, customer_id),
        )
        return dict(cur.fetchone())


def update_orb_subscription_state(
    conn,
    *,
    user_id: int | None = None,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
    stripe_price_id: str | None = None,
    orb_plan: str | None = None,
    subscription_status: str | None = None,
    current_period_start: datetime | None = None,
    current_period_end: datetime | None = None,
    cancel_at_period_end: bool | None = None,
    payment_failed_at: datetime | None = None,
    clear_payment_failed: bool = False,
) -> dict[str, Any] | None:
    existing = None
    if user_id is not None:
        existing = get_orb_subscription(conn, user_id)
    elif stripe_customer_id:
        existing = get_orb_subscription_by_customer_id(conn, stripe_customer_id)
    if not existing:
        if user_id is None:
            return None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO orb_subscriptions (user_id, stripe_customer_id)
                VALUES (%s, %s)
                RETURNING id, user_id
                """,
                (user_id, stripe_customer_id),
            )
            existing = dict(cur.fetchone())

    resolved_user_id = int(existing["user_id"])
    fields: list[str] = ["updated_at = NOW()"]
    values: list[Any] = []
    if stripe_customer_id is not None:
        fields.append("stripe_customer_id = %s")
        values.append(stripe_customer_id.strip())
    if stripe_subscription_id is not None:
        fields.append("stripe_subscription_id = %s")
        values.append(stripe_subscription_id.strip() or None)
    if stripe_price_id is not None:
        fields.append("stripe_price_id = %s")
        values.append(stripe_price_id.strip() or None)
    if orb_plan is not None:
        fields.append("orb_plan = %s")
        values.append(orb_plan.strip())
    if subscription_status is not None:
        fields.append("subscription_status = %s")
        values.append(subscription_status.strip().lower())
    if current_period_start is not None:
        fields.append("current_period_start = %s")
        values.append(current_period_start)
    if current_period_end is not None:
        fields.append("current_period_end = %s")
        values.append(current_period_end)
    if cancel_at_period_end is not None:
        fields.append("cancel_at_period_end = %s")
        values.append(bool(cancel_at_period_end))
    if payment_failed_at is not None:
        fields.append("payment_failed_at = %s")
        values.append(payment_failed_at)
    elif clear_payment_failed:
        fields.append("payment_failed_at = NULL")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE orb_subscriptions
            SET {", ".join(fields)}
            WHERE user_id = %s
            RETURNING
                id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
                orb_plan, subscription_status, current_period_start, current_period_end,
                cancel_at_period_end, payment_failed_at, created_at, updated_at
            """,
            tuple(values + [resolved_user_id]),
        )
        return _row(cur.fetchone())


def clear_orb_subscription(conn, *, stripe_customer_id: str) -> dict[str, Any] | None:
    return update_orb_subscription_state(
        conn,
        stripe_customer_id=stripe_customer_id,
        stripe_subscription_id=None,
        subscription_status="cancelled",
        current_period_end=None,
        cancel_at_period_end=False,
    )


def has_orb_safety_acceptance(
    conn,
    user_id: int,
    *,
    product: str = "orb_residential",
    version: str = ORB_SAFETY_ACCEPTANCE_VERSION,
) -> bool:
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM orb_safety_acceptances
                WHERE user_id = %s AND product = %s AND version = %s
                LIMIT 1
                """,
                (user_id, product, version),
            )
            return cur.fetchone() is not None
    except Exception as exc:
        if not _has_table_error(exc):
            raise
        _safe_rollback(conn)
        return False


def record_orb_safety_acceptance(
    conn,
    *,
    user_id: int,
    product: str = "orb_residential",
    version: str = ORB_SAFETY_ACCEPTANCE_VERSION,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO orb_safety_acceptances (user_id, product, version, metadata)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id, user_id, product, version, accepted_at, metadata
            """,
            (user_id, product, version, Json(metadata or {})),
        )
        row = cur.fetchone()
        if row:
            return dict(row)
        cur.execute(
            """
            SELECT id, user_id, product, version, accepted_at, metadata
            FROM orb_safety_acceptances
            WHERE user_id = %s AND product = %s AND version = %s
            LIMIT 1
            """,
            (user_id, product, version),
        )
        existing = cur.fetchone()
        return dict(existing) if existing else {}


def user_has_used_orb_trial(conn, user_id: int) -> bool:
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1 FROM orb_trials WHERE user_id = %s LIMIT 1
                """,
                (user_id,),
            )
            return cur.fetchone() is not None
    except Exception as exc:
        if not _has_table_error(exc):
            raise
        _safe_rollback(conn)
        return False
