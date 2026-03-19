from typing import Any


def ensure_billing_columns(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
            """
        )

        cur.execute(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
            """
        )

        cur.execute(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
            """
        )

        cur.execute(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS plan_name TEXT;
            """
        )

        cur.execute(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
            """
        )

        cur.execute(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
            ON users (stripe_customer_id);
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id
            ON users (stripe_subscription_id);
            """
        )

        conn.commit()


def get_user_billing_by_user_id(conn, user_id: int) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                full_name,
                stripe_customer_id,
                stripe_subscription_id,
                subscription_status,
                plan_name,
                current_period_end,
                is_active
            FROM users
            WHERE id = %s
            LIMIT 1;
            """,
            (user_id,)
        )

        row = cur.fetchone()
        return dict(row) if row else None


def get_user_billing_by_email(conn, email: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                full_name,
                stripe_customer_id,
                stripe_subscription_id,
                subscription_status,
                plan_name,
                current_period_end,
                is_active
            FROM users
            WHERE LOWER(email) = LOWER(%s)
            LIMIT 1;
            """,
            (email,)
        )

        row = cur.fetchone()
        return dict(row) if row else None


def get_user_billing_by_customer_id(conn, stripe_customer_id: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                full_name,
                stripe_customer_id,
                stripe_subscription_id,
                subscription_status,
                plan_name,
                current_period_end,
                is_active
            FROM users
            WHERE stripe_customer_id = %s
            LIMIT 1;
            """,
            (stripe_customer_id,)
        )

        row = cur.fetchone()
        return dict(row) if row else None


def set_stripe_customer_id(conn, user_id: int, stripe_customer_id: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE users
            SET stripe_customer_id = %s
            WHERE id = %s
            RETURNING
                id,
                email,
                full_name,
                stripe_customer_id,
                stripe_subscription_id,
                subscription_status,
                plan_name,
                current_period_end,
                is_active;
            """,
            (stripe_customer_id, user_id)
        )

        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None


def update_subscription_status_by_customer_id(
    conn,
    stripe_customer_id: str,
    stripe_subscription_id: str | None,
    subscription_status: str,
    plan_name: str | None,
    current_period_end,
    is_active: bool
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE users
            SET
                stripe_subscription_id = %s,
                subscription_status = %s,
                plan_name = %s,
                current_period_end = %s,
                is_active = %s
            WHERE stripe_customer_id = %s
            RETURNING
                id,
                email,
                full_name,
                stripe_customer_id,
                stripe_subscription_id,
                subscription_status,
                plan_name,
                current_period_end,
                is_active;
            """,
            (
                stripe_subscription_id,
                subscription_status,
                plan_name,
                current_period_end,
                is_active,
                stripe_customer_id,
            )
        )

        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None
