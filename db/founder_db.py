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


async def ensure_founder_tables() -> None:
    conn = await get_db_connection()
    try:
        await conn.execute(CREATE_FOUNDER_TABLES_SQL)
    finally:
        await release_db_connection(conn)


def _row_to_dict(row: Any) -> dict[str, Any]:
    return dict(row) if row else {}


def _rows_to_list(rows: Any) -> list[dict[str, Any]]:
    return [dict(row) for row in rows or []]


# ============================================================
# AI THREADS / MESSAGES
# ============================================================

async def create_founder_thread(
    user_id: int,
    title: str = "Founder AI Chat",
    mode: str = "strategy",
) -> int:
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO founder_ai_threads (user_id, title, mode)
            VALUES ($1, $2, $3)
            RETURNING id
            """,
            user_id,
            title,
            mode,
        )
        return int(row["id"])
    finally:
        await release_db_connection(conn)


async def save_founder_message(
    thread_id: int,
    user_id: int,
    role: str,
    content: str,
) -> None:
    conn = await get_db_connection()
    try:
        await conn.execute(
            """
            INSERT INTO founder_ai_messages (thread_id, user_id, role, content)
            VALUES ($1, $2, $3, $4)
            """,
            thread_id,
            user_id,
            role,
            content,
        )

        await conn.execute(
            """
            UPDATE founder_ai_threads
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2
            """,
            thread_id,
            user_id,
        )
    finally:
        await release_db_connection(conn)


async def list_founder_threads(user_id: int) -> list[dict[str, Any]]:
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT id, title, mode, created_at, updated_at
            FROM founder_ai_threads
            WHERE user_id = $1
            ORDER BY updated_at DESC
            LIMIT 50
            """,
            user_id,
        )
        return _rows_to_list(rows)
    finally:
        await release_db_connection(conn)


async def get_founder_messages(
    user_id: int,
    thread_id: int,
) -> list[dict[str, Any]]:
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT m.id, m.role, m.content, m.created_at
            FROM founder_ai_messages m
            JOIN founder_ai_threads t ON t.id = m.thread_id
            WHERE m.thread_id = $1 AND t.user_id = $2
            ORDER BY m.created_at ASC
            """,
            thread_id,
            user_id,
        )
        return _rows_to_list(rows)
    finally:
        await release_db_connection(conn)


# ============================================================
# LEADS
# ============================================================

async def create_founder_lead(
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
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
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
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
            user_id,
            organisation_name,
            contact_name,
            contact_role,
            email,
            phone,
            website,
            status,
            notes,
        )
        return _row_to_dict(row)
    finally:
        await release_db_connection(conn)


async def list_founder_leads(user_id: int) -> list[dict[str, Any]]:
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
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
            WHERE user_id = $1
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 200
            """,
            user_id,
        )
        return _rows_to_list(rows)
    finally:
        await release_db_connection(conn)


async def update_founder_lead_status(
    *,
    user_id: int,
    lead_id: int,
    status: str,
) -> dict[str, Any]:
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            UPDATE founder_leads
            SET status = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2
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
            lead_id,
            user_id,
            status,
        )
        return _row_to_dict(row)
    finally:
        await release_db_connection(conn)


# ============================================================
# TASKS
# ============================================================

async def create_founder_task(
    *,
    user_id: int,
    title: str,
    status: str = "open",
    priority: str = "medium",
    due_date: str | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO founder_tasks (
                user_id,
                title,
                status,
                priority,
                due_date,
                notes
            )
            VALUES ($1, $2, $3, $4, $5, $6)
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
            user_id,
            title,
            status,
            priority,
            due_date,
            notes,
        )
        return _row_to_dict(row)
    finally:
        await release_db_connection(conn)


async def list_founder_tasks(user_id: int) -> list[dict[str, Any]]:
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
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
            WHERE user_id = $1
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
            user_id,
        )
        return _rows_to_list(rows)
    finally:
        await release_db_connection(conn)


async def update_founder_task_status(
    *,
    user_id: int,
    task_id: int,
    status: str,
) -> dict[str, Any]:
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            UPDATE founder_tasks
            SET status = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2
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
            task_id,
            user_id,
            status,
        )
        return _row_to_dict(row)
    finally:
        await release_db_connection(conn)


# ============================================================
# STRATEGY NOTES
# ============================================================

async def create_founder_strategy_note(
    *,
    user_id: int,
    title: str,
    content: str,
) -> dict[str, Any]:
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO founder_strategy_notes (
                user_id,
                title,
                content
            )
            VALUES ($1, $2, $3)
            RETURNING
                id,
                user_id,
                title,
                content,
                created_at,
                updated_at
            """,
            user_id,
            title,
            content,
        )
        return _row_to_dict(row)
    finally:
        await release_db_connection(conn)


async def list_founder_strategy_notes(user_id: int) -> list[dict[str, Any]]:
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT
                id,
                user_id,
                title,
                content,
                created_at,
                updated_at
            FROM founder_strategy_notes
            WHERE user_id = $1
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 100
            """,
            user_id,
        )
        return _rows_to_list(rows)
    finally:
        await release_db_connection(conn)