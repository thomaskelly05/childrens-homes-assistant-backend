import json
from typing import Any


def ensure_ai_note_templates_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_note_templates (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                sections_json TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_note_templates_user_id
            ON ai_note_templates (user_id);
            """
        )

        conn.commit()


def _row_to_template(row) -> dict[str, Any]:
    item = dict(row) if row else {}

    if item:
        try:
            item["sections"] = json.loads(item.pop("sections_json", "[]"))
        except Exception:
            item["sections"] = []

    return item


def list_ai_note_templates(conn, user_id: int) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                user_id,
                name,
                sections_json,
                created_at,
                updated_at
            FROM ai_note_templates
            WHERE user_id = %s
            ORDER BY updated_at DESC, created_at DESC;
            """,
            (user_id,)
        )

        rows = cur.fetchall()

    return [_row_to_template(row) for row in rows]


def get_ai_note_template(
    conn,
    template_id: int,
    user_id: int
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                user_id,
                name,
                sections_json,
                created_at,
                updated_at
            FROM ai_note_templates
            WHERE id = %s
              AND user_id = %s
            LIMIT 1;
            """,
            (template_id, user_id)
        )

        row = cur.fetchone()

    return _row_to_template(row) if row else None


def insert_ai_note_template(
    conn,
    user_id: int,
    name: str,
    sections: list[str]
) -> dict[str, Any]:
    sections_json = json.dumps(sections)

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ai_note_templates (
                user_id,
                name,
                sections_json
            )
            VALUES (%s, %s, %s)
            RETURNING
                id,
                user_id,
                name,
                sections_json,
                created_at,
                updated_at;
            """,
            (user_id, name, sections_json)
        )

        row = cur.fetchone()
        conn.commit()

    return _row_to_template(row)


def update_ai_note_template(
    conn,
    template_id: int,
    user_id: int,
    name: str,
    sections: list[str]
) -> dict[str, Any] | None:
    sections_json = json.dumps(sections)

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE ai_note_templates
            SET
                name = %s,
                sections_json = %s,
                updated_at = NOW()
            WHERE id = %s
              AND user_id = %s
            RETURNING
                id,
                user_id,
                name,
                sections_json,
                created_at,
                updated_at;
            """,
            (name, sections_json, template_id, user_id)
        )

        row = cur.fetchone()
        conn.commit()

    return _row_to_template(row) if row else None


def delete_ai_note_template(conn, template_id: int, user_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM ai_note_templates
            WHERE id = %s
              AND user_id = %s
            RETURNING id;
            """,
            (template_id, user_id)
        )

        row = cur.fetchone()
        conn.commit()

    return bool(row)
