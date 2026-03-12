from typing import Optional


def create_ai_notes_table(conn):
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_notes (
                id SERIAL PRIMARY KEY,
                child_id INTEGER,
                staff_id INTEGER,
                transcript TEXT NOT NULL,
                ai_draft TEXT NOT NULL,
                final_note TEXT NOT NULL,
                safeguarding_flag BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            """
        )
        conn.commit()


def save_ai_note(
    conn,
    child_id: Optional[int],
    staff_id: Optional[int],
    transcript: str,
    ai_draft: str,
    final_note: str,
    safeguarding_flag: bool
):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ai_notes (
                child_id,
                staff_id,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, child_id, staff_id, transcript, ai_draft, final_note, safeguarding_flag, created_at;
            """,
            (
                child_id,
                staff_id,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag
            )
        )
        row = cur.fetchone()
        conn.commit()
        return row


def get_recent_ai_notes(conn, child_id: Optional[int] = None, limit: int = 20):
    with conn.cursor() as cur:
        if child_id is not None:
            cur.execute(
                """
                SELECT id, child_id, staff_id, transcript, ai_draft, final_note, safeguarding_flag, created_at
                FROM ai_notes
                WHERE child_id = %s
                ORDER BY created_at DESC
                LIMIT %s;
                """,
                (child_id, limit)
            )
        else:
            cur.execute(
                """
                SELECT id, child_id, staff_id, transcript, ai_draft, final_note, safeguarding_flag, created_at
                FROM ai_notes
                ORDER BY created_at DESC
                LIMIT %s;
                """,
                (limit,)
            )

        return cur.fetchall()
