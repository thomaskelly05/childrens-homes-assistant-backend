from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Any

from schemas.data_intelligence import CacheEntry


_CARE_HUB_INVALIDATION = {"care_hub_live"}

CACHE_EVENTS: dict[str, set[str]] = {
    "daily_note_saved": {
        "child_daily_summary",
        "child_7_day_summary",
        "child_30_day_summary",
        "chronology_cluster_summary",
        "sccif_evidence_coverage",
        "manager_daily_digest",
        "home_inspection_readiness",
        "orb_answer_template",
        *_CARE_HUB_INVALIDATION,
    },
    "incident_saved": {
        "chronology_cluster_summary",
        "sccif_evidence_coverage",
        "reg45_evidence_pack",
        "safeguarding_digest",
        "home_inspection_readiness",
        *_CARE_HUB_INVALIDATION,
    },
    "safeguarding_record_saved": {
        "chronology_cluster_summary",
        "safeguarding_digest",
        "reg45_evidence_pack",
        "home_inspection_readiness",
        *_CARE_HUB_INVALIDATION,
    },
    "missing_episode_saved": {
        "safeguarding_digest",
        "home_inspection_readiness",
        *_CARE_HUB_INVALIDATION,
    },
    "action_completed": {
        "reg44_action_plan",
        "reg45_evidence_pack",
        "manager_daily_digest",
        "home_inspection_readiness",
        *_CARE_HUB_INVALIDATION,
    },
    "document_uploaded": {"sccif_evidence_coverage", "reg45_evidence_pack", "lac_review_pack"},
    "report_generated": {"reg45_evidence_pack", "lac_review_pack", "orb_answer_template"},
    "manager_review_completed": {
        "manager_daily_digest",
        "home_inspection_readiness",
        "reg44_action_plan",
        "reg45_evidence_pack",
        *_CARE_HUB_INVALIDATION,
    },
    "operational_feed_changed": _CARE_HUB_INVALIDATION,
}


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def _normalise_scope(scope: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in scope.items() if value not in (None, "", [], {})}


class IntelligenceCacheService:
    """Small cache facade with deterministic keys and explicit invalidation metadata."""

    def __init__(self) -> None:
        self._entries: dict[str, CacheEntry] = {}
        self._invalidation_log: list[dict[str, Any]] = []

    def build_cache_key(
        self,
        *,
        cache_type: str,
        provider_id: int | None = None,
        home_id: int | None = None,
        young_person_id: int | None = None,
        date_range: str | None = None,
        record_version: str | int | None = None,
        metadata_version: str = "2026-05-14.v1",
        extra: dict[str, Any] | None = None,
    ) -> str:
        payload = {
            "provider_id": provider_id,
            "home_id": home_id,
            "young_person_id": young_person_id,
            "date_range": date_range,
            "record_version": record_version,
            "metadata_version": metadata_version,
            "cache_type": cache_type,
            "extra": extra or {},
        }
        raw = json.dumps(payload, sort_keys=True, default=str, ensure_ascii=True)
        digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]
        return f"intel:{cache_type}:{digest}"

    def set(
        self,
        *,
        key: str,
        value: dict[str, Any],
        cache_type: str,
        provider_id: int | None = None,
        home_id: int | None = None,
        young_person_id: int | None = None,
        record_version: str | int | None = None,
        metadata_version: str = "2026-05-14.v1",
    ) -> CacheEntry:
        entry = CacheEntry(
            key=key,
            value=value,
            cache_type=cache_type,
            provider_id=provider_id,
            home_id=home_id,
            young_person_id=young_person_id,
            record_version=record_version,
            metadata_version=metadata_version,
            created_at=_now(),
        )
        self._entries[key] = entry
        return entry

    def get(self, key: str) -> CacheEntry | None:
        return self._entries.get(key)

    def invalidate_for_event(self, event_type: str, *, scope: dict[str, Any] | None = None) -> dict[str, Any]:
        affected_types = CACHE_EVENTS.get(event_type, set())
        scope = _normalise_scope(scope or {})
        removed: list[str] = []
        for key, entry in list(self._entries.items()):
            if entry.cache_type not in affected_types:
                continue
            if scope.get("provider_id") and entry.provider_id != scope["provider_id"]:
                continue
            if scope.get("home_id") and entry.home_id != scope["home_id"]:
                continue
            if scope.get("young_person_id") and entry.young_person_id != scope["young_person_id"]:
                continue
            removed.append(key)
            self._entries.pop(key, None)
        result = {
            "event_type": event_type,
            "affected_cache_types": sorted(affected_types),
            "invalidated_keys": removed,
            "scope": scope,
            "reliable": bool(affected_types),
            "created_at": _now(),
        }
        self._invalidation_log.append(result)
        self._invalidation_log = self._invalidation_log[-100:]
        return result

    def invalidation_health(self) -> dict[str, Any]:
        return {
            "known_events": sorted(CACHE_EVENTS),
            "recent_invalidations": self._invalidation_log[-20:],
            "tracked_entries": len(self._entries),
        }

    def clear(self) -> None:
        self._entries.clear()


intelligence_cache_service = IntelligenceCacheService()
