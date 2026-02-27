# db.py
import os
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

POOL = SimpleConnectionPool(
    1,
    10,
    DATABASE_URL,
    cursor_factory=RealDictCursor,
)

def get_db():
    conn = POOL.getconn()
    try:
        yield conn
    finally:
        POOL.putconn(conn)


# ---------------------------------------------------------
# STAFF QUERIES
# ---------------------------------------------------------

def list_staff(conn):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, email, role, home_id, created_at, updated_at, archived
            FROM users
            WHERE role = 'staff'
            ORDER BY email
            """
        )
        return cur.fetchall()


def get_staff(conn, user_id):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, email, role, home_id, created_at, updated_at, archived
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )
        return cur.fetchone()


def create_staff(conn, data):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (email, role, home_id)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (data.email, data.role, data.home_id)
        )
        new_id = cur.fetchone()["id"]
        conn.commit()
        return new_id


def update_staff(conn, user_id, data):
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE users
            SET email = COALESCE(%s, email),
                role = COALESCE(%s, role),
                home_id = COALESCE(%s, home_id),
                updated_at = NOW()
            WHERE id = %s
            """,
            (data.email, data.role, data.home_id, user_id)
        )
        conn.commit()


def archive_staff(conn, user_id):
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE users
            SET archived = TRUE,
                updated_at = NOW()
            WHERE id = %s
            """,
            (user_id,)
        )
        conn.commit()


def assign_staff_to_home(conn, user_id, home_id):
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE users
            SET home_id = %s
            WHERE id = %s
            """,
            (home_id, user_id)
        )
        conn.commit()


# ---------------------------------------------------------
# PROVIDER QUERIES
# ---------------------------------------------------------

def list_providers(conn):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                name,
                region,
                address,
                postcode,
                local_authority,
                safeguarding_lead_name,
                safeguarding_lead_email,
                archived,
                created_at,
                updated_at
            FROM providers
            WHERE archived = FALSE
            ORDER BY name
            """
        )
        return cur.fetchall()


def get_provider(conn, provider_id):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                name,
                region,
                address,
                postcode,
                local_authority,
                safeguarding_lead_name,
                safeguarding_lead_email,
                archived,
                created_at,
                updated_at
            FROM providers
            WHERE id = %s
            """,
            (provider_id,)
        )
        return cur.fetchone()


def create_provider(conn, data):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO providers
                (name,
                 region,
                 address,
                 postcode,
                 local_authority,
                 safeguarding_lead_name,
                 safeguarding_lead_email)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                data.name,
                data.region,
                data.address,
                data.postcode,
                data.local_authority,
                data.safeguarding_lead_name,
                data.safeguarding_lead_email,
            )
        )
        new_id = cur.fetchone()["id"]
        conn.commit()
        return new_id
