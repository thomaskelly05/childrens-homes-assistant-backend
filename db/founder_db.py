from __future__ import annotations

from typing import Any

from db.connection import get_db_connection, release_db_connection


CREATE_FOUNDER_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS founder_ai_threads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT 'Founder AI Chat',
    mode TEXT NOT NULL DEFAULT 'strategy',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS founder_ai_messages (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER REFERENCES founder_ai_threads(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS founder_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS founder_leads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    organisation_name TEXT NOT NULL,
    contact_name TEXT,
    contact_role TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS founder_strategy_notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

_tables_ready = False


def ensure_founder_tables() -> None:
    global _tables_ready
    if _tables_ready:
        return

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(CREATE_FOUNDER_TABLES_SQL)
        conn.commit()
        _tables_ready = True
    finally:
        release_db_connection(conn)


def _row_to_dict(row: Any) -> dict[str, Any]:
    return dict(row) if row else {}


def _rows_to_list(rows: Any) -> list[dict[str, Any]]:
    return [dict(row) for row in rows or []]


def create_founder_thread(
    user_id: int,
    title: str = "Founder AI Chat",
    mode: str = "strategy",
) -> int:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO founder_ai_threads (user_id, title, mode)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (user_id, title, mode),
            )
            row = cur.fetchone()
        conn.commit()
        return int(row[0])
    finally:
        release_db_connection(conn)


def save_founder_message(
    thread_id: int,
    user_id: int,
    role: str,
    content: str,
) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO founder_ai_messages (thread_id, user_id, role, content)
                VALUES (%s, %s, %s, %s)
                """,
                (thread_id, user_id, role, content),
            )
            cur.execute(
                """
                UPDATE founder_ai_threads
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND user_id = %s
                """,
                (thread_id, user_id),
            )
        conn.commit()
    finally:
        release_db_connection(conn)


def list_founder_threads(user_id: int) -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, mode, created_at, updated_at
                FROM founder_ai_threads
                WHERE user_id = %s
                ORDER BY updated_at DESC
                LIMIT 50
                """,
                (user_id,),
            )
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        return rows
    finally:
        release_db_connection(conn)


def get_founder_messages(
    user_id: int,
    thread_id: int,
) -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT m.id, m.role, m.content, m.created_at
                FROM founder_ai_messages m
                JOIN founder_ai_threads t ON t.id = m.thread_id
                WHERE m.thread_id = %s AND t.user_id = %s
                ORDER BY m.created_at ASC
                """,
                (thread_id, user_id),
            )
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        return rows
    finally:
        release_db_connection(conn)


def create_founder_lead(
    *,
    user_id: int,
    organisation_name: str,
    contact_name: str | None = None,
    contact_role: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    website: str | None = None,
    status: str = "new",
    notes: str | None = None,
) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO founder_leads (
                    user_id,
                    organisation_name,
                    contact_name,
                    contact_role,
                    email,
                    phone,
                    website,
                    status,
                    notes
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING
                    id,
                    user_id,
                    organisation_name,
                    contact_name,
                    contact_role,
                    email,
                    phone,
                    website,
                    status,
                    notes,
                    created_at,
                    updated_at
                """,
                (
                    user_id,
                    organisation_name,
                    contact_name,
                    contact_role,
                    email,
                    phone,
                    website,
                    status,
                    notes,
                ),
            )
            columns = [desc[0] for desc in cur.description]
            row = cur.fetchone()
        conn.commit()
        return dict(zip(columns, row)) if row else {}
    finally:
        release_db_connection(conn)


def list_founder_leads(user_id: int) -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    user_id,
                    organisation_name,
                    contact_name,
                    contact_role,
                    email,
                    phone,
                    website,
                    status,
                    notes,
                    created_at,
                    updated_at
                FROM founder_leads
                WHERE user_id = %s
                ORDER BY updated_at DESC, created_at DESC
                LIMIT 200
                """,
                (user_id,),
            )
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        return rows
    finally:
        release_db_connection(conn)


def update_founder_lead_status(
    *,
    user_id: int,
    lead_id: int,
    status: str,
) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE founder_leads
                SET status = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND user_id = %s
                RETURNING
                    id,
                    user_id,
                    organisation_name,
                    contact_name,
                    contact_role,
                    email,
                    phone,
                    website,
                    status,
                    notes,
                    created_at,
                    updated_at
                """,
                (status, lead_id, user_id),
            )
            columns = [desc[0] for desc in cur.description]
            row = cur.fetchone()
        conn.commit()
        return dict(zip(columns, row)) if row else {}
    finally:
        release_db_connection(conn)


def create_founder_task(
    *,
    user_id: int,
    title: str,
    status: str = "open",
    priority: str = "medium",
    due_date: str | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO founder_tasks (
                    user_id,
                    title,
                    status,
                    priority,
                    due_date,
                    notes
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING
                    id,
                    user_id,
                    title,
                    status,
                    priority,
                    due_date,
                    notes,
                    created_at,
                    updated_at
                """,
                (user_id, title, status, priority, due_date, notes),
            )
            columns = [desc[0] for desc in cur.description]
            row = cur.fetchone()
        conn.commit()
        return dict(zip(columns, row)) if row else {}
    finally:
        release_db_connection(conn)


def list_founder_tasks(user_id: int) -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    user_id,
                    title,
                    status,
                    priority,
                    due_date,
                    notes,
                    created_at,
                    updated_at
                FROM founder_tasks
                WHERE user_id = %s
                ORDER BY
                    CASE
                        WHEN status = 'open' THEN 1
                        WHEN status = 'in_progress' THEN 2
                        WHEN status = 'done' THEN 3
                        ELSE 4
                    END,
                    due_date ASC NULLS LAST,
                    updated_at DESC
                LIMIT 200
                """,
                (user_id,),
            )
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        return rows
    finally:
        release_db_connection(conn)


def update_founder_task_status(
    *,
    user_id: int,
    task_id: int,
    status: str,
) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE founder_tasks
                SET status = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND user_id = %s
                RETURNING
                    id,
                    user_id,
                    title,
                    status,
                    priority,
                    due_date,
                    notes,
                    created_at,
                    updated_at
                """,
                (status, task_id, user_id),
            )
            columns = [desc[0] for desc in cur.description]
            row = cur.fetchone()
        conn.commit()
        return dict(zip(columns, row)) if row else {}
    finally:
        release_db_connection(conn)


def create_founder_strategy_note(
    *,
    user_id: int,
    title: str,
    content: str,
) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO founder_strategy_notes (
                    user_id,
                    title,
                    content
                )
                VALUES (%s, %s, %s)
                RETURNING
                    id,
                    user_id,
                    title,
                    content,
                    created_at,
                    updated_at
                """,
                (user_id, title, content),
            )
            columns = [desc[0] for desc in cur.description]
            row = cur.fetchone()
        conn.commit()
        return dict(zip(columns, row)) if row else {}
    finally:
        release_db_connection(conn)


def list_founder_strategy_notes(user_id: int) -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    user_id,
                    title,
                    content,
                    created_at,
                    updated_at
                FROM founder_strategy_notes
                WHERE user_id = %s
                ORDER BY updated_at DESC, created_at DESC
                LIMIT 100
                """,
                (user_id,),
            )
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        return rows
    finally:
        release_db_connection(conn)
