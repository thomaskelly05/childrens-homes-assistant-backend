from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
from typing import Any

from repositories.isn_repository import isn_repository


class ISNMissingPatternService:
    """Analyses contextual patterns linked to missing episodes."""

    def __init__(self, repository=isn_repository):
        self.repository = repository

    def analyse(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        young_person_id: int | None = None,
        limit: int = 1000,
    ) -> dict[str, Any]:
        signals = self.repository.list_signals(
            conn,
            current_user=current_user,
            filters={
                "young_person_id": young_person_id,
                "signal_type": "missing_episode",
            },
            limit=limit,
        )

        weekday_counter: Counter[str] = Counter()
        hour_counter: Counter[int] = Counter()
        route_counter: Counter[str] = Counter()
        location_counter: Counter[str] = Counter()
        peer_counter: Counter[str] = Counter()
        linked_signal_ids: dict[str, list[str]] = defaultdict(list)

        for signal in signals:
            occurred = self._parse(signal.occurred_at or signal.created_at)
            if occurred:
                weekday_counter[occurred.strftime("%A")] += 1
                hour_counter[occurred.hour] += 1

            if signal.transport_route:
                route = signal.transport_route.strip().lower()
                route_counter[route] += 1
                linked_signal_ids[route].append(signal.id)

            if signal.location_text:
                location = signal.location_text.strip().lower()
                location_counter[location] += 1
                linked_signal_ids[location].append(signal.id)

            if signal.alias_or_nickname:
                peer = signal.alias_or_nickname.strip().lower()
                peer_counter[peer] += 1
                linked_signal_ids[peer].append(signal.id)

        return {
            "ok": True,
            "country": "UK",
            "young_person_id": young_person_id,
            "missing_episode_count": len(signals),
            "weekday_patterns": self._counter_payload(weekday_counter, linked_signal_ids),
            "hour_patterns": self._hour_payload(hour_counter),
            "transport_patterns": self._counter_payload(route_counter, linked_signal_ids),
            "location_patterns": self._counter_payload(location_counter, linked_signal_ids),
            "peer_patterns": self._counter_payload(peer_counter, linked_signal_ids),
            "professional_note": "Patterns should support contextual safeguarding understanding and prevention planning.",
        }

    def _counter_payload(self, counter: Counter[str], linked: dict[str, list[str]]) -> list[dict[str, Any]]:
        return [
            {
                "key": key,
                "count": count,
                "linked_signal_ids": linked.get(key, []),
            }
            for key, count in counter.most_common()
        ]

    def _hour_payload(self, counter: Counter[int]) -> list[dict[str, Any]]:
        return [
            {
                "hour": hour,
                "count": count,
                "contextual_window": self._window(hour),
            }
            for hour, count in counter.most_common()
        ]

    def _window(self, hour: int) -> str:
        if hour < 6:
            return "overnight"
        if hour < 12:
            return "morning"
        if hour < 17:
            return "afternoon"
        if hour < 22:
            return "evening"
        return "late_evening"

    def _parse(self, value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except Exception:
            return None


isn_missing_pattern_service = ISNMissingPatternService()
