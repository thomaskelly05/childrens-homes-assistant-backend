"""Anonymised ORB learning ledger — in-memory with optional DB persistence hook."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from schemas.orb_learning_ledger import OrbLearningLedgerEntry


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _redact_prompt(text: str, max_len: int = 400) -> str:
    t = str(text or "").strip()
    t = re.sub(r"\b[A-Z][a-z]+ [A-Z][a-z]+\b", "[name]", t)
    t = re.sub(r"\b\d{1,3}\s*years?\s*old\b", "[age]", t, flags=re.I)
    if len(t) > max_len:
        t = t[:max_len] + "..."
    return t


class OrbLearningLedgerService:
    def __init__(self) -> None:
        self._entries: list[dict[str, Any]] = []

    def record(self, entry: OrbLearningLedgerEntry | dict[str, Any]) -> dict[str, Any]:
        if isinstance(entry, OrbLearningLedgerEntry):
            payload = entry.model_dump()
        else:
            payload = dict(entry)
        payload["prompt_summary"] = _redact_prompt(payload.get("prompt_summary") or payload.get("prompt_text") or "")
        payload.pop("prompt_text", None)
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
