from __future__ import annotations

import hashlib
import json
from typing import Any

from services.risk_intelligence_language import now_iso, safe_payload


class LocationContextCacheService:
    """Small deterministic cache for locality context and provider lookups."""

    def __init__(self) -> None:
        self._entries: dict[str, dict[str, Any]] = {}

    def key(self, *, scope: dict[str, Any], context_type: str) -> str:
        raw = json.dumps({"scope": scope, "context_type": context_type}, sort_keys=True, default=str, ensure_ascii=True)
        return f"locality:{context_type}:{hashlib.sha256(raw.encode('utf-8')).hexdigest()[:24]}"

    def get(self, key: str) -> dict[str, Any] | None:
        return self._entries.get(key)

    def set(self, key: str, value: dict[str, Any], *, source: str = "deterministic_rules") -> dict[str, Any]:
        entry = {
            "key": key,
            "source": source,
            "created_at": now_iso(),
            "value": safe_payload(value),
        }
        self._entries[key] = entry
        return entry

    def get_or_set(self, *, scope: dict[str, Any], context_type: str, value: dict[str, Any]) -> dict[str, Any]:
        key = self.key(scope=scope, context_type=context_type)
        cached = self.get(key)
        if cached:
            return {**cached, "cache_hit": True}
        entry = self.set(key, value)
        return {**entry, "cache_hit": False}

    def clear(self) -> None:
        self._entries.clear()


location_context_cache_service = LocationContextCacheService()
