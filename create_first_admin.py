import os
import sys

import psycopg2
from psycopg2.extras import RealDictCursor

from auth.passwords import hash_password
from auth.rbac import CANONICAL_STAFF_ROLES, normalise_role

def require_env(name: str) -> str:
    value = (os.getenv(name) or "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_db():
    database_url = require_env("DATABASE_URL")
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)


def validate_password(password: str) -> None:
    if len(password) < 12:
        raise RuntimeError("FIRST_ADMIN_PASSWORD must be at least 12 characters long.")
    if password.lower() == password or password.upper() == password:
        raise RuntimeError("FIRST_ADMIN_PASSWORD must include upper and lower case letters.")
    if not any(ch.isdigit() for ch in password):
        raise RuntimeError("FIRST_ADMIN_PASSWORD must include at least one number.")


def main() -> None:
    email = require_env("FIRST_ADMIN_EMAIL").lower()
    password = require_env("FIRST_ADMIN_PASSWORD")
    first_name = (os.getenv("FIRST_ADMIN_FIRST_NAME") or "System").strip()
    last_name = (os.getenv("FIRST_ADMIN_LAST_NAME") or "Admin").strip()
    role = normalise_role(os.getenv("FIRST_ADMIN_ROLE") or "admin")
    home_id_raw = (os.getenv("FIRST_ADMIN_HOME_ID") or "").strip()

    if role not in CANONICAL_STAFF_ROLES:
        raise RuntimeError(
            "FIRST_ADMIN_ROLE must be one of: "
            + ", ".join(CANONICAL_STAFF_ROLES)
        )

    validate_password(password)

    home_id = int(home_id_raw) if home_id_raw else None
    password_hash = hash_password(password)

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, role, archived, is_active
                FROM users
                WHERE lower(email) = %s
                LIMIT 1
                """,
                (email,),
            )
            existing = cur.fetchone()

            if existing:
                cur.execute(
                    """
                    UPDATE users
                    SET
                        password_hash = %s,
                        role = %s,
                        home_id = %s,
                        first_name = %s,
                        last_name = %s,
                        archived = FALSE,
                        is_active = TRUE,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING id, email, role, home_id
                    """,
                    (
                        password_hash,
                        role,
                        home_id,
                        first_name,
                        last_name,
                        existing["id"],
                    ),
                )
                user = cur.fetchone()
                action = "updated"
            else:
                cur.execute(
                    """
                    INSERT INTO users (
                        email,
                        password_hash,
                        role,
                        home_id,
                        first_name,
                        last_name,
                        archived,
                        is_active,
                        created_at,
                        updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, FALSE, TRUE, NOW(), NOW())
                    RETURNING id, email, role, home_id
                    """,
                    (
                        email,
                        password_hash,
                        role,
                        home_id,
                        first_name,
                        last_name,
                    ),
                )
                user = cur.fetchone()
                action = "created"

        conn.commit()
        print(f"Admin user {action}: id={user['id']} email={user['email']} role={user['role']}")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
