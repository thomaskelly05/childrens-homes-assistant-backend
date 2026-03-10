import os
import psycopg2


def get_connection():

    return psycopg2.connect(
        host=os.environ.get("DB_HOST"),
        database=os.environ.get("DB_NAME"),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD")
    )


def save_message(session_id, role, message):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO conversations (session_id, role, message)
        VALUES (%s, %s, %s)
        """,
        (session_id, role, message)
    )

    conn.commit()

    cur.close()
    conn.close()


def load_recent_messages(session_id, limit=10):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT role, message
        FROM conversations
        WHERE session_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (session_id, limit)
    )

    rows = cur.fetchall()

    cur.close()
    conn.close()

    rows.reverse()

    history = []

    for r in rows:

        history.append({
            "role": r[0],
            "message": r[1]
        })

    return history
