from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass, field

from fastapi import HTTPException, status

from services.audit_event_service import record_audit_event

logger = logging.getLogger("indicare.orb.ai_abuse_guard")


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


MAX_PROMPT_CHARS = _env_int("ORB_MAX_PROMPT_CHARS", 12_000)
MAX_TRANSCRIPT_CHARS = _env_int("ORB_MAX_TRANSCRIPT_CHARS", 50_000)
MAX_DOCUMENT_TEXT_CHARS = _env_int("ORB_MAX_DOCUMENT_TEXT_CHARS", 500_000)
MAX_COMPARISON_TEXT_CHARS = _env_int("ORB_MAX_COMPARISON_TEXT_CHARS", 200_000)
MAX_CONVERSATION_TURNS = _env_int("ORB_MAX_CONVERSATION_TURNS", 20)
MAX_STREAMING_SECONDS = _env_int("ORB_MAX_STREAMING_SECONDS", 120)
MAX_PROVIDER_TIMEOUT_SECONDS = _env_int("ORB_MAX_PROVIDER_TIMEOUT_SECONDS", 90)
DAILY_AI_CALLS_PER_USER = _env_int("ORB_DAILY_AI_CALLS_PER_USER", 800)

USER_MESSAGES = {
    "prompt_too_long": "Your message is too long. Please shorten it and try again.",
    "transcript_too_long": "The transcript is too long to process safely. Please shorten it.",
    "document_too_long": "The document text exceeds the allowed size. Please upload a smaller document.",
    "comparison_too_long": "The combined document text for comparison is too large. Please compare smaller documents.",
    "too_many_turns": "This conversation has too many turns to send at once. Start a new chat or remove older messages.",
    "daily_ai_limit": "You have reached today's AI usage limit. Please try again tomorrow or contact support.",
}


@dataclass
class _DailyCallCounter:
    max_calls: int
    buckets: dict[str, list[float]] = field(default_factory=dict)

    def check_and_increment(self, user_id: int) -> bool:
        key = f"user:{user_id}"
        now = time.time()
        values = [ts for ts in self.buckets.get(key, []) if now - ts <= 86400]
        if len(values) >= self.max_calls:
            self.buckets[key] = values
            return False
        values.append(now)
        self.buckets[key] = values
        return True

    def reset(self) -> None:
        self.buckets.clear()


_daily_counter = _DailyCallCounter(max_calls=DAILY_AI_CALLS_PER_USER)


def user_limit_message(code: str) -> str:
    return USER_MESSAGES.get(code, "Request limit reached. Please try again later.")


def _raise_limit(code: str, *, user_id: int | None = None, metadata: dict | None = None) -> None:
    meta = {"code": code, **(metadata or {})}
    if user_id is not None:
        meta["user_id"] = user_id
    record_audit_event(
        event_type="security.ai_abuse_limit",
        action="ai_abuse_limit",
        outcome="blocked",
        actor={"id": user_id} if user_id is not None else {},
        metadata=meta,
    )
    logger.warning("security.ai_abuse_limit code=%s user_id=%s", code, user_id)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"code": code, "message": user_limit_message(code)},
    )


def enforce_prompt_length(text: str | None, *, user_id: int | None = None) -> None:
    if text and len(text) > MAX_PROMPT_CHARS:
        _raise_limit("prompt_too_long", user_id=user_id, metadata={"length": len(text), "max": MAX_PROMPT_CHARS})


def enforce_transcript_length(text: str | None, *, user_id: int | None = None) -> None:
    if text and len(text) > MAX_TRANSCRIPT_CHARS:
        _raise_limit(
            "transcript_too_long",
            user_id=user_id,
            metadata={"length": len(text), "max": MAX_TRANSCRIPT_CHARS},
        )


def enforce_document_text_length(text: str | None, *, user_id: int | None = None) -> None:
    if text and len(text) > MAX_DOCUMENT_TEXT_CHARS:
        _raise_limit(
            "document_too_long",
            user_id=user_id,
            metadata={"length": len(text), "max": MAX_DOCUMENT_TEXT_CHARS},
        )


def enforce_comparison_text_length(text: str | None, *, user_id: int | None = None) -> None:
    if text and len(text) > MAX_COMPARISON_TEXT_CHARS:
        _raise_limit(
            "comparison_too_long",
            user_id=user_id,
            metadata={"length": len(text), "max": MAX_COMPARISON_TEXT_CHARS},
        )


def enforce_conversation_turns(history: list | None, *, user_id: int | None = None) -> None:
    count = len(history or [])
    if count > MAX_CONVERSATION_TURNS:
        _raise_limit(
            "too_many_turns",
            user_id=user_id,
            metadata={"turns": count, "max": MAX_CONVERSATION_TURNS},
        )


def enforce_daily_ai_call_budget(user_id: int | None) -> None:
    if user_id is None:
        return
    if os.getenv("DISABLE_AI_DAILY_LIMIT", "false").strip().lower() in {"1", "true", "yes", "on"}:
        return
    if not _daily_counter.check_and_increment(int(user_id)):
        _raise_limit("daily_ai_limit", user_id=user_id)


def policy_snapshot() -> dict[str, int]:
    return {
        "max_prompt_chars": MAX_PROMPT_CHARS,
        "max_transcript_chars": MAX_TRANSCRIPT_CHARS,
        "max_document_text_chars": MAX_DOCUMENT_TEXT_CHARS,
        "max_comparison_text_chars": MAX_COMPARISON_TEXT_CHARS,
        "max_conversation_turns": MAX_CONVERSATION_TURNS,
        "max_streaming_seconds": MAX_STREAMING_SECONDS,
        "max_provider_timeout_seconds": MAX_PROVIDER_TIMEOUT_SECONDS,
        "daily_ai_calls_per_user": DAILY_AI_CALLS_PER_USER,
    }


def reset_daily_counters_for_tests() -> None:
    _daily_counter.reset()
