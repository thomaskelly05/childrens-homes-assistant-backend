from typing import Any


def ensure_ai_meetings_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_meeting_notes (
                id SERIAL PRIMARY KEY,
                transcript TEXT NOT NULL,
                ai_draft TEXT NOT NULL,
                final_note TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        conn.commit()


def insert_ai_meeting_note(
    conn,
    transcript: str,
    ai_draft: str,
    final_note: str
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ai_meeting_notes (
                transcript,
                ai_draft,
                final_note
            )
            VALUES (%s, %s, %s)
            RETURNING
                id,
                transcript,
                ai_draft,
                final_note,
                created_at,
                updated_at;
            """,
            (
                transcript,
                ai_draft,
                final_note
            )
        )

        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else {}


def list_ai_meeting_notes(conn, limit: int = 50) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                transcript,
                ai_draft,
                final_note,
                created_at,
                updated_at
            FROM ai_meeting_notes
            ORDER BY created_at DESC
            LIMIT %s;
            """,
            (limit,)
        )

        rows = cur.fetchall()
        return [dict(row) for row in rows]
