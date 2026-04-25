from __future__ import annotations

import logging
import time
from typing import Any

from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger("indicare.memory")

MEMORY_CACHE_TTL_SECONDS = 120
MAX_MESSAGE_SUMMARY_CHARS = 160

_memory_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _trim_text(text: str, limit: int = MAX_MESSAGE_SUMMARY_CHARS) -> str:
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

def _normalise_session_id(session_id: str) -> int | None:
    """
    Only numeric conversation IDs are used for database-backed memory.

    OS assistant session IDs like "young-person-1" or "home-2" should not
    query the messages table directly because they are scoped assistant
    session labels, not message conversation IDs.
    """
    try:
        return int(session_id)
    except (TypeError, ValueError):
        return None



def _cache_key(session_id: int, limit: int) -> str:
    return f"{session_id}:{limit}"


def _cleanup_cache() -> None:
    now = time.time()
    expired = [
        key for key, (expires_at, _rows) in _memory_cache.items()
        if expires_at <= now
    ]
    for key in expired:
        _memory_cache.pop(key, None)


def _get_cached_messages(session_id: int, limit: int) -> list[dict[str, Any]] | None:
    _cleanup_cache()
    entry = _memory_cache.get(_cache_key(session_id, limit))
    if not entry:
        return None

    expires_at, rows = entry
    if expires_at <= time.time():
        _memory_cache.pop(_cache_key(session_id, limit), None)
        return None

    return rows


def _set_cached_messages(session_id: int, limit: int, rows: list[dict[str, Any]]) -> None:
    _memory_cache[_cache_key(session_id, limit)] = (
        time.time() + MEMORY_CACHE_TTL_SECONDS,
        rows,
    )


def load_recent_messages(session_id: str, limit: int = 4) -> list[dict[str, Any]]:
    normalised_session_id = _normalise_session_id(session_id)
    if normalised_session_id is None:
        return []

    safe_limit = max(1, min(int(limit), 6))

    cached = _get_cached_messages(normalised_session_id, safe_limit)
    if cached is not None:
        return cached

    conn = None
    try:
        conn = get_db_connection()

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT role, message, created_at
                FROM messages
                WHERE conversation_id = %s
                ORDER BY created_at DESC, id DESC
                LIMIT %s
                """,
                (normalised_session_id, safe_limit),
            )
            fetched = cur.fetchall()

        rows = list(reversed(fetched or []))
        _set_cached_messages(normalised_session_id, safe_limit, rows)
        return rows

    except Exception:
        logger.exception("Failed to load recent messages for session_id=%s", session_id)
        return []

    finally:
        release_db_connection(conn)


def summarise_recent_messages(
    messages: list[dict[str, Any]],
    max_items: int = 4,
    include_assistant: bool = True,
) -> str:
    if not messages:
        return ""

    safe_max_items = max(1, min(int(max_items), 5))
    trimmed = messages[-safe_max_items:]

    lines: list[str] = []
    for item in trimmed:
        role = _normalise_role(item.get("role"))
        message = _safe_string(item.get("message"))

        if not role or not message:
            continue

        if not include_assistant and role.lower() == "assistant":
            continue

        lines.append(f"• {role}: {_trim_text(message)}")

    if not lines:
        return ""

    return "Recent conversation context:\n" + "\n".join(lines)


def build_user_preference_context(user_context: dict[str, Any] | None = None) -> str:
    if not user_context:
        return ""

    parts: list[str] = []

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


def get_memory_context(
    session_id: str,
    user_context: dict[str, Any] | None = None,
    message: str = "",
    mode: str = "",
    recent_limit: int = 4,
) -> str:
    include_assistant = mode in {"reflective", "supervision", "manager_review"}

    recent_messages = load_recent_messages(session_id=session_id, limit=recent_limit)

    recent_context = summarise_recent_messages(
        recent_messages,
        max_items=recent_limit,
        include_assistant=include_assistant,
    )
    preference_context = build_user_preference_context(user_context)
    mode_hint = build_mode_memory_hint(mode=mode, message=message)

    parts = [part for part in [preference_context, recent_context, mode_hint] if part]
    if not parts:
        return ""

    return "\n\n".join(parts)
