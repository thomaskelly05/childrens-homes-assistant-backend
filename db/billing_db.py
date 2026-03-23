import logging
from datetime import datetime
from typing import Any

from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


def get_user_billing_by_user_id(conn, user_id: int) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                stripe_customer_id,
                stripe_subscription_id,
                subscription_status,
                plan_name,
                current_period_end,
                is_active
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def get_user_billing_by_email(conn, email: str) -> dict[str, Any] | None:
    normalised_email = email.strip().lower()

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                stripe_customer_id,
                stripe_subscription_id,
                subscription_status,
                plan_name,
                current_period_end,
                is_active
            FROM users
            WHERE LOWER(email) = %s
            LIMIT 1
            """,
            (normalised_email,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def get_user_billing_by_customer_id(conn, stripe_customer_id: str) -> dict[str, Any] | None:
    customer_id = stripe_customer_id.strip()

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                stripe_customer_id,
                stripe_subscription_id,
                subscription_status,
                plan_name,
                current_period_end,
                is_active
            FROM users
            WHERE stripe_customer_id = %s
            LIMIT 1
            """,
            (customer_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def set_stripe_customer_id(conn, user_id: int, stripe_customer_id: str) -> dict[str, Any] | None:
    customer_id = stripe_customer_id.strip()

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE users
            SET
                stripe_customer_id = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING
                id,
                email,
                stripe_customer_id,
                stripe_subscription_id,
                subscription_status,
                plan_name,
                current_period_end,
                is_active
            """,
            (customer_id, user_id),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def update_subscription_status_by_customer_id(
    conn,
    stripe_customer_id: str,
    stripe_subscription_id: str | None,
    subscription_status: str,
    plan_name: str | None,
    current_period_end: datetime | None,
    is_active: bool,
) -> dict[str, Any] | None:
    customer_id = stripe_customer_id.strip()
    subscription_id = stripe_subscription_id.strip() if stripe_subscription_id else None
    status_value = subscription_status.strip().lower()
    plan_value = plan_name.strip() if plan_name else None

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE users
            SET
                stripe_subscription_id = %s,
                subscription_status = %s,
                plan_name = %s,
                current_period_end = %s,
                is_active = %s,
                updated_at = NOW()
            WHERE stripe_customer_id = %s
            RETURNING
                id,
                email,
                stripe_customer_id,
                stripe_subscription_id,
                subscription_status,
                plan_name,
                current_period_end,
                is_active
            """,
            (
                subscription_id,
                status_value,
                plan_value,
                current_period_end,
                is_active,
                customer_id,
            ),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def clear_subscription_by_customer_id(
    conn,
    stripe_customer_id: str,
) -> dict[str, Any] | None:
    customer_id = stripe_customer_id.strip()

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE users
            SET
                stripe_subscription_id = NULL,
                subscription_status = 'inactive',
                plan_name = NULL,
                current_period_end = NULL,
                is_active = false,
                updated_at = NOW()
            WHERE stripe_customer_id = %s
            RETURNING
                id,
                email,
                stripe_customer_id,
                stripe_subscription_id,
                subscription_status,
                plan_name,
                current_period_end,
                is_active
            """,
            (customer_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None
