import json
from typing import Any


def _json_dumps(value: Any) -> str:
    return json.dumps(value or [])


def _json_loads(value: Any) -> list[dict[str, Any]]:
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


def _normalise_row(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if not row:
        return None
    data = dict(row)
    data["speaker_segments"] = _json_loads(data.get("speaker_segments"))
    return data


def ensure_ai_note_versions_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_meeting_note_versions (
                id SERIAL PRIMARY KEY,
                note_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                title TEXT,
                transcript TEXT NOT NULL,
                ai_draft TEXT NOT NULL,
                final_note TEXT NOT NULL,
                speaker_segments JSONB NOT NULL DEFAULT '[]'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )

        cur.execute(
            """
            ALTER TABLE ai_meeting_note_versions
            ADD COLUMN IF NOT EXISTS speaker_segments JSONB NOT NULL DEFAULT '[]'::jsonb;
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_meeting_note_versions_note_id
            ON ai_meeting_note_versions (note_id, created_at DESC);
            """
        )

        conn.commit()


def insert_ai_note_version(
    conn,
    note_id: int,
    user_id: int,
    title: str,
    transcript: str,
    ai_draft: str,
    final_note: str,
    speaker_segments: list[dict[str, Any]] | None = None
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ai_meeting_note_versions (
                note_id,
                user_id,
                title,
                transcript,
                ai_draft,
                final_note,
                speaker_segments
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
            RETURNING
                id,
                note_id,
                user_id,
                title,
                transcript,
                ai_draft,
                final_note,
                speaker_segments,
                created_at;
            """,
            (
                note_id,
                user_id,
                title,
                transcript,
                ai_draft,
                final_note,
                _json_dumps(speaker_segments)
            )
        )

        row = cur.fetchone()
        conn.commit()
        return _normalise_row(dict(row) if row else {}) or {}


def list_ai_note_versions(
    conn,
    note_id: int,
    user_id: int,
    limit: int = 20
) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                note_id,
                user_id,
                title,
                transcript,
                ai_draft,
                final_note,
                speaker_segments,
                created_at
            FROM ai_meeting_note_versions
            WHERE note_id = %s
              AND user_id = %s
            ORDER BY created_at DESC
            LIMIT %s;
            """,
            (note_id, user_id, limit)
        )

        rows = cur.fetchall()
        return [_normalise_row(dict(row)) for row in rows]


def get_ai_note_version(
    conn,
    version_id: int,
    user_id: int
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                note_id,
                user_id,
                title,
                transcript,
                ai_draft,
                final_note,
                speaker_segments,
                created_at
            FROM ai_meeting_note_versions
            WHERE id = %s
              AND user_id = %s
            LIMIT 1;
            """,
            (version_id, user_id)
        )

        row = cur.fetchone()
        return _normalise_row(dict(row) if row else None)
