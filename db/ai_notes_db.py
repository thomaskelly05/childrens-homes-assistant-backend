from typing import Any


def ensure_ai_meetings_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_meeting_notes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT,
                transcript TEXT NOT NULL,
                ai_draft TEXT NOT NULL,
                final_note TEXT NOT NULL,
                safeguarding_flag BOOLEAN NOT NULL DEFAULT FALSE,
                safeguarding_reason TEXT,

                template_name TEXT,
                service_type TEXT,
                shift_type TEXT,
                meeting_format TEXT,
                record_author TEXT,
                young_person_name TEXT,
                record_date TEXT,
                location_context TEXT,

                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )

        cur.execute(
            """
            ALTER TABLE ai_meeting_notes
            ADD COLUMN IF NOT EXISTS user_id INTEGER;
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
            ALTER TABLE ai_meeting_notes
            ADD COLUMN IF NOT EXISTS template_name TEXT;
            """
        )

        cur.execute(
            """
            ALTER TABLE ai_meeting_notes
            ADD COLUMN IF NOT EXISTS service_type TEXT;
            """
        )

        cur.execute(
            """
            ALTER TABLE ai_meeting_notes
            ADD COLUMN IF NOT EXISTS shift_type TEXT;
            """
        )

        cur.execute(
            """
            ALTER TABLE ai_meeting_notes
            ADD COLUMN IF NOT EXISTS meeting_format TEXT;
            """
        )

        cur.execute(
            """
            ALTER TABLE ai_meeting_notes
            ADD COLUMN IF NOT EXISTS record_author TEXT;
            """
        )

        cur.execute(
            """
            ALTER TABLE ai_meeting_notes
            ADD COLUMN IF NOT EXISTS young_person_name TEXT;
            """
        )

        cur.execute(
            """
            ALTER TABLE ai_meeting_notes
            ADD COLUMN IF NOT EXISTS record_date TEXT;
            """
        )

        cur.execute(
            """
            ALTER TABLE ai_meeting_notes
            ADD COLUMN IF NOT EXISTS location_context TEXT;
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_meeting_notes_user_id
            ON ai_meeting_notes (user_id);
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
    user_id: int,
    transcript: str,
    ai_draft: str,
    final_note: str,
    title: str | None = None,
    safeguarding_flag: bool = False,
    safeguarding_reason: str | None = None,
    template_name: str | None = None,
    service_type: str | None = None,
    shift_type: str | None = None,
    meeting_format: str | None = None,
    record_author: str | None = None,
    young_person_name: str | None = None,
    record_date: str | None = None,
    location_context: str | None = None
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ai_meeting_notes (
                user_id,
                title,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag,
                safeguarding_reason,
                template_name,
                service_type,
                shift_type,
                meeting_format,
                record_author,
                young_person_name,
                record_date,
                location_context
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING
                id,
                user_id,
                title,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag,
                safeguarding_reason,
                template_name,
                service_type,
                shift_type,
                meeting_format,
                record_author,
                young_person_name,
                record_date,
                location_context,
                created_at,
                updated_at;
            """,
            (
                user_id,
                title,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag,
                safeguarding_reason,
                template_name,
                service_type,
                shift_type,
                meeting_format,
                record_author,
                young_person_name,
                record_date,
                location_context
            )
        )

        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else {}


def update_ai_meeting_note(
    conn,
    note_id: int,
    user_id: int,
    transcript: str,
    ai_draft: str,
    final_note: str,
    title: str | None = None,
    safeguarding_flag: bool = False,
    safeguarding_reason: str | None = None,
    template_name: str | None = None,
    service_type: str | None = None,
    shift_type: str | None = None,
    meeting_format: str | None = None,
    record_author: str | None = None,
    young_person_name: str | None = None,
    record_date: str | None = None,
    location_context: str | None = None
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
                template_name = %s,
                service_type = %s,
                shift_type = %s,
                meeting_format = %s,
                record_author = %s,
                young_person_name = %s,
                record_date = %s,
                location_context = %s,
                updated_at = NOW()
            WHERE id = %s
              AND user_id = %s
            RETURNING
                id,
                user_id,
                title,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag,
                safeguarding_reason,
                template_name,
                service_type,
                shift_type,
                meeting_format,
                record_author,
                young_person_name,
                record_date,
                location_context,
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
                template_name,
                service_type,
                shift_type,
                meeting_format,
                record_author,
                young_person_name,
                record_date,
                location_context,
                note_id,
                user_id
            )
        )

        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None


def list_ai_meeting_notes(
    conn,
    user_id: int,
    limit: int = 50
) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                user_id,
                title,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag,
                safeguarding_reason,
                template_name,
                service_type,
                shift_type,
                meeting_format,
                record_author,
                young_person_name,
                record_date,
                location_context,
                created_at,
                updated_at
            FROM ai_meeting_notes
            WHERE user_id = %s
            ORDER BY updated_at DESC, created_at DESC
            LIMIT %s;
            """,
            (user_id, limit)
        )

        rows = cur.fetchall()
        return [dict(row) for row in rows]


def get_ai_meeting_note(
    conn,
    note_id: int,
    user_id: int
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                user_id,
                title,
                transcript,
                ai_draft,
                final_note,
                safeguarding_flag,
                safeguarding_reason,
                template_name,
                service_type,
                shift_type,
                meeting_format,
                record_author,
                young_person_name,
                record_date,
                location_context,
                created_at,
                updated_at
            FROM ai_meeting_notes
            WHERE id = %s
              AND user_id = %s
            LIMIT 1;
            """,
            (note_id, user_id)
        )

        row = cur.fetchone()
        return dict(row) if row else None


def delete_ai_meeting_note(
    conn,
    note_id: int,
    user_id: int
) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM ai_meeting_notes
            WHERE id = %s
              AND user_id = %s
            RETURNING id;
            """,
            (note_id, user_id)
        )

        row = cur.fetchone()
        conn.commit()
        return bool(row)
