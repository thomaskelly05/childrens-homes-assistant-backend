"""Anonymised ORB learning ledger — in-memory with optional DB persistence hook."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from schemas.orb_learning_ledger import OrbLearningLedgerEntry
from services.ai_redaction_service import ai_redaction_service

_PROMPT_SUMMARY_MAX = 400
_FORBIDDEN_STORE_KEYS = frozenset({"prompt_text", "full_prompt", "transcript", "raw_transcript"})


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _redact_prompt_summary(text: str, *, max_len: int = _PROMPT_SUMMARY_MAX) -> str:
    """Redact identifiers using the shared AI redaction service, then truncate."""
    raw = str(text or "").strip()
    if not raw:
        return ""
    result = ai_redaction_service.redact_to_result(raw, mode="safeguarding_strict")
    redacted = result.text.strip()
    if len(redacted) > max_len:
        redacted = redacted[:max_len].rstrip() + "..."
    return redacted


def _sanitize_learning_tags(tags: list[Any] | None) -> list[str]:
    safe: list[str] = []
    for tag in tags or []:
        value = str(tag or "").strip().lower()
        if not value:
            continue
        if any(ch.isdigit() for ch in value) and len(value) > 32:
            continue
        safe.append(value[:64])
    return safe[:20]


class OrbLearningLedgerService:
    def __init__(self) -> None:
        self._entries: list[dict[str, Any]] = []

    def record(self, entry: OrbLearningLedgerEntry | dict[str, Any]) -> dict[str, Any]:
        if isinstance(entry, OrbLearningLedgerEntry):
            payload = entry.model_dump()
        else:
            payload = dict(entry)

        for key in _FORBIDDEN_STORE_KEYS:
            payload.pop(key, None)

        summary_source = payload.get("prompt_summary") or ""
        payload["prompt_summary"] = _redact_prompt_summary(summary_source)
        payload["learning_tags"] = _sanitize_learning_tags(payload.get("learning_tags"))
        payload["recorded_at"] = _utc_now()
        self._entries.append(payload)
        return payload

    def list_recent(self, limit: int = 50) -> list[dict[str, Any]]:
        return self._entries[-limit:]

    def aggregate_tags(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for e in self._entries:
            for tag in e.get("learning_tags") or []:
                counts[tag] = counts.get(tag, 0) + 1
        return counts


orb_learning_ledger_service = OrbLearningLedgerService()
