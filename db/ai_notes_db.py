import json
from typing import Any


def _json_dumps(value: Any) -> str:
    return json.dumps(value or {} if isinstance(value, dict) else value or [])


def _json_loads_object(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _json_loads_list(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []


def _normalise_note_row(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if not row:
        return None

    data = dict(row)
    data["speaker_segments"] = _json_loads_list(data.get("speaker_segments"))
    data["speaker_map"] = _json_loads_object(data.get("speaker_map"))
    return data


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

                speaker_segments JSONB NOT NULL DEFAULT '[]'::jsonb,
                speaker_map JSONB NOT NULL DEFAULT '{}'::jsonb,
                note_status TEXT NOT NULL DEFAULT 'draft',
                deleted_at TIMESTAMPTZ NULL,

                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )

        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS user_id INTEGER;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS title TEXT;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS safeguarding_flag BOOLEAN NOT NULL DEFAULT FALSE;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS safeguarding_reason TEXT;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS template_name TEXT;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS service_type TEXT;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS shift_type TEXT;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS meeting_format TEXT;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS record_author TEXT;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS young_person_name TEXT;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS record_date TEXT;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS location_context TEXT;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS speaker_segments JSONB NOT NULL DEFAULT '[]'::jsonb;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS speaker_map JSONB NOT NULL DEFAULT '{}'::jsonb;")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS note_status TEXT NOT NULL DEFAULT 'draft';")
        cur.execute("ALTER TABLE ai_meeting_notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;")

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_meeting_notes_user_id
            ON ai_meeting_notes (user_id);
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_meeting_notes_user_updated
            ON ai_meeting_notes (user_id, updated_at DESC);
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
    location_context: str | None = None,
    speaker_segments: list[dict[str, Any]] | None = None,
    speaker_map: dict[str, str] | None = None,
    note_status: str = "draft"
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
                location_context,
                speaker_segments,
                speaker_map,
                note_status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
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
                speaker_segments,
                speaker_map,
                note_status,
                deleted_at,
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
                location_context,
                _json_dumps(speaker_segments or []),
                _json_dumps(speaker_map or {}),
                note_status
            )
        )

        row = cur.fetchone()
        conn.commit()
        return _normalise_note_row(dict(row) if row else {}) or {}


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
    location_context: str | None = None,
    speaker_segments: list[dict[str, Any]] | None = None,
    speaker_map: dict[str, str] | None = None,
    note_status: str = "draft"
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
                speaker_segments = %s::jsonb,
                speaker_map = %s::jsonb,
                note_status = %s,
                updated_at = NOW()
            WHERE id = %s
              AND user_id = %s
              AND deleted_at IS NULL
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
                speaker_segments,
                speaker_map,
                note_status,
                deleted_at,
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
                _json_dumps(speaker_segments or []),
                _json_dumps(speaker_map or {}),
                note_status,
                note_id,
                user_id
            )
        )

        row = cur.fetchone()
        conn.commit()
        return _normalise_note_row(dict(row) if row else None)


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
                speaker_segments,
                speaker_map,
                note_status,
                deleted_at,
                created_at,
                updated_at
            FROM ai_meeting_notes
            WHERE user_id = %s
              AND deleted_at IS NULL
            ORDER BY updated_at DESC, created_at DESC
            LIMIT %s;
            """,
            (user_id, limit)
        )

        rows = cur.fetchall()
        return [_normalise_note_row(dict(row)) for row in rows]


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
                speaker_segments,
                speaker_map,
                note_status,
                deleted_at,
                created_at,
                updated_at
            FROM ai_meeting_notes
            WHERE id = %s
              AND user_id = %s
              AND deleted_at IS NULL
            LIMIT 1;
            """,
            (note_id, user_id)
        )

        row = cur.fetchone()
        return _normalise_note_row(dict(row) if row else None)


def soft_delete_ai_meeting_note(
    conn,
    note_id: int,
    user_id: int
) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE ai_meeting_notes
            SET deleted_at = NOW(), updated_at = NOW()
            WHERE id = %s
              AND user_id = %s
              AND deleted_at IS NULL
            RETURNING id;
            """,
            (note_id, user_id)
        )

        row = cur.fetchone()
        conn.commit()
        return bool(row)
