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
        return [dict(row) for row in rows]
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
        return [dict(row) for row in rows]
    finally:
        await release_db_connection(conn)
