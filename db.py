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

# STAFF QUERIES

def list_staff(conn):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, email, role, home_id, created_at
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
            SELECT id, email, role, home_id, created_at
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
                home_id = COALESCE(%s, home_id)
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
            SET archived = TRUE
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
