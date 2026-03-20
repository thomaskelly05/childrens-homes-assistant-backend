from __future__ import annotations

import logging
import os
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("indicare.memory")


# ---------------------------------------------------------
# DATABASE
# ---------------------------------------------------------
def get_connection():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable missing")
    return psycopg2.connect(database_url)


# ---------------------------------------------------------
# HELPERS
# ---------------------------------------------------------
def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _trim_text(text: str, limit: int = 180) -> str:
    text = _safe_string(text)
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].strip() + "..."


def _normalise_role(role: str) -> str:
    role = _safe_string(role).lower()
    if role == "assistant":
        return "Assistant"
    if role == "user":
        return "User"
    return role.title() if role else ""


# ---------------------------------------------------------
# RECENT MESSAGE LOADING
# ---------------------------------------------------------
def load_recent_messages(session_id: str, limit: int = 4) -> list[dict[str, Any]]:
    conn = None

    try:
        safe_limit = max(1, min(int(limit), 8))
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
                (session_id, safe_limit),
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


# ---------------------------------------------------------
# MEMORY SUMMARIES
# ---------------------------------------------------------
def summarise_recent_messages(
    messages: list[dict[str, Any]],
    max_items: int = 4,
    include_assistant: bool = True,
) -> str:
    if not messages:
        return ""

    safe_max_items = max(1, min(int(max_items), 6))
    trimmed = messages[-safe_max_items:]

    lines = []
    for item in trimmed:
        role = _normalise_role(item.get("role"))
        message = _safe_string(item.get("message"))

        if not role or not message:
            continue

        if not include_assistant and role.lower() == "assistant":
            continue

        message = _trim_text(message, 180)
        lines.append(f"• {role}: {message}")

    if not lines:
        return ""

    return "Recent conversation context:\n" + "\n".join(lines)


def build_user_preference_context(user_context: dict[str, Any] | None = None) -> str:
    if not user_context:
        return ""

    parts = []

    role = _safe_string(user_context.get("role"))
    preferred_style = _safe_string(user_context.get("preferred_style"))
    preferred_length = _safe_string(user_context.get("preferred_length"))
    preferred_tone = _safe_string(user_context.get("preferred_tone"))

    if role:
        parts.append(f"• User role: {role}")
    if preferred_style:
        parts.append(f"• Preferred style: {preferred_style}")
    if preferred_tone:
        parts.append(f"• Preferred tone: {preferred_tone}")
    if preferred_length:
        parts.append(f"• Preferred detail level: {preferred_length}")

    if not parts:
        return ""

    return "Stable user context:\n" + "\n".join(parts)


def build_mode_memory_hint(mode: str, message: str) -> str:
    mode = _safe_string(mode).lower()
    message = _safe_string(message).lower()

    if not mode:
        return ""

    if mode in {"recording", "incident_summary", "chronology", "handover"}:
        return "Use recent context only to preserve continuity and factual accuracy. Do not let previous wording override the current facts."

    if mode in {"reflective", "supervision"}:
        return "Use recent context to maintain reflective continuity, but keep the answer focused on the current question."

    if mode in {"rewrite"}:
        return "Use recent context only where it helps maintain consistent wording and structure."

    if "policy" in message or "regulation" in message or "ofsted" in message:
        return "Use recent context lightly. Prioritise accuracy over conversational continuity."

    return ""


# ---------------------------------------------------------
# MAIN MEMORY API
# ---------------------------------------------------------
def get_memory_context(
    session_id: str,
    user_context: dict[str, Any] | None = None,
    message: str = "",
    mode: str = "",
    recent_limit: int = 4,
) -> str:
    recent_messages = load_recent_messages(session_id=session_id, limit=recent_limit)

    recent_context = summarise_recent_messages(
        recent_messages,
        max_items=recent_limit,
        include_assistant=True,
    )
    preference_context = build_user_preference_context(user_context)
    mode_hint = build_mode_memory_hint(mode=mode, message=message)

    parts = [part for part in [preference_context, recent_context, mode_hint] if part]
    if not parts:
        return ""

    return "\n\n".join(parts)
