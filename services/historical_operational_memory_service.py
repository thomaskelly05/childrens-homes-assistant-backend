from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any


@dataclass
class HistoricalMemoryEntry:
    timestamp: str
    memory_type: str
    correlation_id: str
    home_id: int | str | None
    child_id: int | str | None
    staff_id: int | str | None
    state: dict[str, Any]
    metadata: dict[str, Any]


class HistoricalOperationalMemoryService:
    """Stores historical operational cognition snapshots.

    This intentionally starts as an in-memory operational repository so it can
    safely integrate with the existing cognition architecture before persistence
    tables are introduced.

    The purpose is not surveillance or prediction.
    The purpose is longitudinal reflective understanding.
    """

    def __init__(self) -> None:
        self._timeline: list[HistoricalMemoryEntry] = []
        self._by_home: dict[str, list[HistoricalMemoryEntry]] = defaultdict(list)
        self._by_child: dict[str, list[HistoricalMemoryEntry]] = defaultdict(list)
        self._by_staff: dict[str, list[HistoricalMemoryEntry]] = defaultdict(list)

    def remember(
        self,
        *,
        memory_type: str,
        correlation_id: str,
        state: dict[str, Any],
        home_id: int | str | None = None,
        child_id: int | str | None = None,
        staff_id: int | str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        entry = HistoricalMemoryEntry(
            timestamp=datetime.now(UTC).isoformat(),
            memory_type=memory_type,
            correlation_id=correlation_id,
            home_id=home_id,
            child_id=child_id,
            staff_id=staff_id,
            state=deepcopy(state),
            metadata=deepcopy(metadata or {}),
        )

        self._timeline.append(entry)

        if home_id is not None:
            self._by_home[str(home_id)].append(entry)

        if child_id is not None:
            self._by_child[str(child_id)].append(entry)

        if staff_id is not None:
            self._by_staff[str(staff_id)].append(entry)

        return {
            "stored": True,
            "timestamp": entry.timestamp,
            "correlation_id": correlation_id,
            "memory_type": memory_type,
        }

    def home_timeline(self, home_id: int | str, *, limit: int = 30) -> dict[str, Any]:
        entries = self._by_home.get(str(home_id), [])[-limit:]
        return {
            "timeline_type": "home_operational_memory",
            "home_id": home_id,
            "entries": [self._entry_to_dict(entry) for entry in entries],
            "trend_summary": self._trend_summary(entries),
        }

    def child_timeline(self, child_id: int | str, *, limit: int = 30) -> dict[str, Any]:
        entries = self._by_child.get(str(child_id), [])[-limit:]
        return {
            "timeline_type": "child_operational_memory",
            "child_id": child_id,
            "entries": [self._entry_to_dict(entry) for entry in entries],
            "trend_summary": self._trend_summary(entries),
        }

    def staff_timeline(self, staff_id: int | str, *, limit: int = 30) -> dict[str, Any]:
        entries = self._by_staff.get(str(staff_id), [])[-limit:]
        return {
            "timeline_type": "staff_operational_memory",
            "staff_id": staff_id,
            "entries": [self._entry_to_dict(entry) for entry in entries],
            "trend_summary": self._trend_summary(entries),
        }

    def provider_timeline(self, *, limit: int = 100) -> dict[str, Any]:
        entries = self._timeline[-limit:]
        return {
            "timeline_type": "provider_operational_memory",
            "entries": [self._entry_to_dict(entry) for entry in entries],
            "trend_summary": self._trend_summary(entries),
        }

    def compare_recent_states(self, *, home_id: int | str, limit: int = 5) -> dict[str, Any]:
        entries = self._by_home.get(str(home_id), [])[-limit:]
        if len(entries) < 2:
            return {
                "comparison_ready": False,
                "reason": "insufficient_history",
            }

        latest = entries[-1]
        previous = entries[-2]

        latest_home = latest.state.get("home_state", {})
        previous_home = previous.state.get("home_state", {})

        latest_climate = latest.state.get("emotional_climate", {})
        previous_climate = previous.state.get("emotional_climate", {})

        return {
            "comparison_ready": True,
            "home_id": home_id,
            "latest_timestamp": latest.timestamp,
            "previous_timestamp": previous.timestamp,
            "state_changes": {
                "home_state": {
                    "previous": previous_home.get("state"),
                    "latest": latest_home.get("state"),
                },
                "emotional_climate": {
                    "previous": previous_climate.get("level"),
                    "latest": latest_climate.get("level"),
                },
                "safeguarding_pressure": {
                    "previous": previous_home.get("safeguarding_pressure"),
                    "latest": latest_home.get("safeguarding_pressure"),
                },
            },
            "reflective_prompts": [
                "What operational changes may explain the shift in state?",
                "What protective factors improved or reduced over time?",
                "What evidence supports the perceived change?",
                "Has leadership intervention altered the trajectory?",
            ],
        }

    def _trend_summary(self, entries: list[HistoricalMemoryEntry]) -> dict[str, Any]:
        if not entries:
            return {
                "status": "no_history",
                "summary": "No historical operational memory available yet.",
            }

        latest = entries[-1]
        first = entries[0]

        latest_home = latest.state.get("home_state", {})
        first_home = first.state.get("home_state", {})

        latest_climate = latest.state.get("emotional_climate", {})
        first_climate = first.state.get("emotional_climate", {})

        return {
            "status": "history_available",
            "entry_count": len(entries),
            "time_span": {
                "from": first.timestamp,
                "to": latest.timestamp,
            },
            "home_state_shift": {
                "from": first_home.get("state"),
                "to": latest_home.get("state"),
            },
            "emotional_climate_shift": {
                "from": first_climate.get("level"),
                "to": latest_climate.get("level"),
            },
            "reflective_note": "Historical memory should support reflection and governance, not automated prediction.",
        }

    def _entry_to_dict(self, entry: HistoricalMemoryEntry) -> dict[str, Any]:
        return {
            "timestamp": entry.timestamp,
            "memory_type": entry.memory_type,
            "correlation_id": entry.correlation_id,
            "home_id": entry.home_id,
            "child_id": entry.child_id,
            "staff_id": entry.staff_id,
            "metadata": entry.metadata,
            "summary": entry.state.get("summary", {}),
            "home_state": entry.state.get("home_state", {}),
            "child_state": entry.state.get("child_state", {}),
            "workforce_state": entry.state.get("workforce_state", {}),
            "emotional_climate": entry.state.get("emotional_climate", {}),
            "evidence_state": entry.state.get("evidence_state", {}),
        }


historical_operational_memory_service = HistoricalOperationalMemoryService()
