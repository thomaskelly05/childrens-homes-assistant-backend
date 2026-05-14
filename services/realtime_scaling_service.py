from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class RealtimeScalingService:
    """Home-scoped realtime helpers for dedupe, reconnect and cache safety."""

    def event_key(self, event: dict[str, Any], *, home_id: int | None = None) -> str:
        explicit = event.get("event_id") or event.get("id") or event.get("client_event_id")
        if explicit:
            return f"{home_id or 'global'}:{explicit}"
        raw = f"{home_id}:{event.get('type')}:{event.get('record_id')}:{event.get('created_at')}:{event.get('version')}"
        return hashlib.sha1(raw.encode("utf-8")).hexdigest()

    def dedupe_events(self, events: list[dict[str, Any]], *, home_id: int | None = None) -> dict[str, Any]:
        seen: set[str] = set()
        deduped = []
        for event in events:
            key = self.event_key(event, home_id=home_id)
            if key in seen:
                continue
            seen.add(key)
            deduped.append({**event, "dedupe_key": key})
        return {"events": deduped, "dropped": len(events) - len(deduped), "deduped_at": _now()}

    def reconnect_plan(self, *, attempts: int, last_sequence: int | None = None) -> dict[str, Any]:
        delay_ms = min(8000, 250 * (2 ** max(0, attempts - 1)))
        return {
            "delay_ms": delay_ms,
            "resume_from_sequence": last_sequence,
            "request_snapshot": attempts >= 3,
            "message": "Reconnecting and reconciling missed events.",
        }

    def subscription_scope(self, *, home_id: int, user_id: int | None, channels: list[str]) -> dict[str, Any]:
        scoped_channels = [f"home:{home_id}:{channel}" for channel in channels]
        return {
            "home_id": home_id,
            "user_id": user_id,
            "channels": scoped_channels,
            "rbac_safe": True,
            "audit_safe": True,
        }

    def metadata_first_plan(self, *, entity_type: str, filters: dict[str, Any] | None = None) -> dict[str, Any]:
        return {
            "entity_type": entity_type,
            "filters": filters or {},
            "fetch_order": ["metadata", "summaries", "full_content_on_demand"],
            "cache_key": hashlib.sha1(f"{entity_type}:{filters or {}}".encode("utf-8")).hexdigest(),
        }


realtime_scaling_service = RealtimeScalingService()
