from typing import Any


def ensure_ai_meetings_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_meeting_notes (
                id SERIAL PRIMARY KEY,
                title TEXT,
                transcript TEXT NOT NULL,
                ai_draft TEXT NOT NULL,
                final_note TEXT NOT NULL,
                safeguarding_flag BOOLEAN NOT NULL DEFAULT FALSE,
                safeguarding_reason TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )

        cur.execute(
            """
            ALTER TABLE ai_meeting_notes
            ADD COLUMN IF NOT EXISTS title TEXT;
            """
        )

        cur.execute(
            """
            ALTER TABLE ai_meeting_notes
            ADD COLUMN IF NOT EXISTS safeguarding_flag BOOLEAN NOT NULL DEFAULT FALSE;
            """
        )

        cur.execute(
            """
            ALTER TABLE ai_meeting_notes
            ADD COLUMN IF NOT EXISTS safeguarding_reason TEXT;
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_meeting_notes_created_at
            ON ai_meeting_notes (created_at DESC);
            """
        )

        conn.commit()


def insert_ai_meeting_note(
    conn,
    transcript: str,
    ai_draft: str,
    final_note: str,
    title: str | None = None,
    safeguarding_flag: bool = False,
    safeguarding_reason: str | None = None
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ai_meeting_notes (
                title,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag,
                safeguarding_reason
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING
                id,
                title,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag,
                safeguarding_reason,
                created_at,
                updated_at;
            """,
            (
                title,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag,
                safeguarding_reason
            )
        )

        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else {}


def update_ai_meeting_note(
    conn,
    note_id: int,
    transcript: str,
    ai_draft: str,
    final_note: str,
    title: str | None = None,
    safeguarding_flag: bool = False,
    safeguarding_reason: str | None = None
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE ai_meeting_notes
            SET
                title = %s,
                transcript = %s,
                ai_draft = %s,
                final_note = %s,
                safeguarding_flag = %s,
                safeguarding_reason = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING
                id,
                title,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag,
                safeguarding_reason,
                created_at,
                updated_at;
            """,
            (
                title,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag,
                safeguarding_reason,
                note_id
            )
        )

        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None


def list_ai_meeting_notes(conn, limit: int = 50) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                title,
                final_note,
                safeguarding_flag,
                safeguarding_reason,
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


def get_ai_meeting_note(conn, note_id: int) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                title,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag,
                safeguarding_reason,
                created_at,
                updated_at
            FROM ai_meeting_notes
            WHERE id = %s
            LIMIT 1;
            """,
            (note_id,)
        )

        row = cur.fetchone()
        return dict(row) if row else None


def delete_ai_meeting_note(conn, note_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM ai_meeting_notes
            WHERE id = %s
            RETURNING id;
            """,
            (note_id,)
        )

        row = cur.fetchone()
        conn.commit()
        return bool(row)
