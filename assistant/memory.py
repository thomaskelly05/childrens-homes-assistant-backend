from __future__ import annotations

import logging
import os
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("indicare.memory")


def get_connection():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable missing")
    return psycopg2.connect(database_url)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def load_recent_messages(session_id: str, limit: int = 4) -> list[dict[str, Any]]:
    conn = None
    rows: list[dict[str, Any]] = []

    try:
        conn = get_connection()

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT role, message, created_at
                FROM messages
                WHERE conversation_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (session_id, limit),
            )
            fetched = cur.fetchall()

        rows = list(reversed(fetched or []))
        return rows

    except Exception as e:
        logger.exception("Failed to load recent messages for session %s: %s", session_id, e)
        return []

    finally:
        if conn:
            conn.close()


def save_message(session_id: str, role: str, message: str) -> bool:
    conn = None

    try:
        conn = get_connection()

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO messages (conversation_id, role, message)
                VALUES (%s, %s, %s)
                """,
                (session_id, role, message),
            )
            conn.commit()

        return True

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Failed to save message for session %s: %s", session_id, e)
        return False

    finally:
        if conn:
            conn.close()


def summarise_recent_messages(messages: list[dict[str, Any]], max_items: int = 4) -> str:
    if not messages:
        return ""

    trimmed = messages[-max_items:]
    lines = []

    for item in trimmed:
        role = _safe_string(item.get("role"))
        message = _safe_string(item.get("message"))

        if not role or not message:
            continue

        if len(message) > 160:
            message = message[:160].rsplit(" ", 1)[0] + "..."

        lines.append(f"{role.title()}: {message}")

    if not lines:
        return ""

    return "Recent conversation context:\n" + "\n".join(f"• {line}" for line in lines)


def build_user_preference_context(user_context: dict[str, Any] | None = None) -> str:
    if not user_context:
        return ""

    parts = []

    role = _safe_string(user_context.get("role"))
    preferred_style = _safe_string(user_context.get("preferred_style"))
    preferred_length = _safe_string(user_context.get("preferred_length"))

    if role:
        parts.append(f"User role: {role}")
    if preferred_style:
        parts.append(f"Preferred style: {preferred_style}")
    if preferred_length:
        parts.append(f"Preferred detail level: {preferred_length}")

    if not parts:
        return ""

    return "Stable user context:\n" + "\n".join(f"• {part}" for part in parts)


def get_memory_context(
    session_id: str,
    user_context: dict[str, Any] | None = None,
    message: str = "",
    mode: str = "",
    recent_limit: int = 4,
) -> str:
    recent_messages = load_recent_messages(session_id=session_id, limit=recent_limit)

    recent_context = summarise_recent_messages(recent_messages, max_items=recent_limit)
    preference_context = build_user_preference_context(user_context)

    parts = [part for part in [preference_context, recent_context] if part]
    if not parts:
        return ""

    return "\n\n".join(parts)
