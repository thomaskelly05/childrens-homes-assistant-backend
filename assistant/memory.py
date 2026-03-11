import os
import psycopg2
from psycopg2.extras import RealDictCursor


def get_connection():

    database_url = os.environ.get("DATABASE_URL")

    if not database_url:
        raise Exception("DATABASE_URL environment variable missing")

    return psycopg2.connect(database_url)


def load_recent_messages(session_id, limit=10):

    conn = get_connection()

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT role, message
            FROM messages
            WHERE conversation_id=%s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (session_id, limit)
        )

        rows = cur.fetchall()

    conn.close()

    return list(reversed(rows))


def save_message(session_id, role, message):

    conn = get_connection()

    with conn.cursor() as cur:

        cur.execute(
            """
            INSERT INTO messages(conversation_id, role, message)
            VALUES (%s, %s, %s)
            """,
            (session_id, role, message)
        )

        conn.commit()

    conn.close()
