from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from repositories.isn_repository import isn_repository


class ISNTimelineService:
    """Builds contextual safeguarding timelines from ISN signals."""

    def __init__(self, repository=isn_repository):
        self.repository = repository

    def timeline(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        young_person_id: int | None = None,
        days: int | None = None,
        limit: int = 1000,
    ) -> dict[str, Any]:
        signals = self.repository.list_signals(
            conn,
            current_user=current_user,
            filters={"young_person_id": young_person_id} if young_person_id else {},
            limit=limit,
        )
        events = [self._event(signal) for signal in signals]
        events.sort(key=lambda item: item["event_at"] or "", reverse=True)
        if days:
            cutoff = datetime.now(timezone.utc).timestamp() - (max(1, min(days, 365)) * 86400)
            events = [event for event in events if self._timestamp(event.get("event_at")) >= cutoff]
        return {
            "ok": True,
            "country": "UK",
            "young_person_id": young_person_id,
            "events": events,
            "total": len(events),
        }

    def grouped_by_child(self, conn: Any, *, current_user: dict[str, Any], limit: int = 2000) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for signal in signals:
            if signal.young_person_id is None:
                continue
            grouped[str(signal.young_person_id)].append(self._event(signal))
        children = []
        for child_id, events in grouped.items():
            events.sort(key=lambda item: item["event_at"] or "", reverse=True)
            children.append(
                {
                    "young_person_id": int(child_id),
                    "event_count": len(events),
                    "highest_risk": self._highest_risk(events),
                    "latest_event_at": events[0].get("event_at") if events else None,
                    "events": events[:50],
                }
            )
        children.sort(key=lambda item: (self._risk_rank(item["highest_risk"]), item["event_count"]), reverse=True)
        return {"ok": True, "country": "UK", "children": children, "total": len(children)}

    def _event(self, signal: Any) -> dict[str, Any]:
        uk_location = (signal.metadata or {}).get("uk_location") or {}
        return {
            "id": signal.id,
            "event_at": signal.occurred_at or signal.created_at,
            "signal_type": signal.signal_type,
            "title": signal.title,
            "summary": signal.summary,
            "risk_level": signal.risk_level,
            "home_id": signal.home_id,
            "young_person_id": signal.young_person_id,
            "location_text": signal.location_text,
            "postcode_prefix": signal.postcode_prefix,
            "region_hint": uk_location.get("region_hint"),
            "contextual_location_type": uk_location.get("contextual_location_type"),
            "transport_route": signal.transport_route,
            "alias_or_nickname": signal.alias_or_nickname,
            "vehicle_description": signal.vehicle_description,
            "digital_handle": signal.digital_handle,
            "indicator_tags": signal.indicator_tags,
            "source_record_type": signal.source_record_type,
            "source_record_id": signal.source_record_id,
        }

    def _highest_risk(self, events: list[dict[str, Any]]) -> str:
        risks = [event.get("risk_level") or "medium" for event in events]
        return max(risks, key=self._risk_rank) if risks else "low"

    def _risk_rank(self, risk: str) -> int:
        return {"low": 1, "medium": 2, "high": 3, "critical": 4}.get(str(risk), 2)

    def _timestamp(self, value: str | None) -> float:
        if not value:
            return 0
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.timestamp()
        except Exception:
            return 0


isn_timeline_service = ISNTimelineService()
