from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

from services.intelligence.event_bus.operational_event_bus import OperationalEvent, operational_event_bus
from services.operational_feed_service import build_operational_feed
from services.operational_metrics_service import operational_metrics_service


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class RealtimeOperationalStreamService:
    """Propagate operational feed intelligence through the converged event bus."""

    STREAM_EVENT_MAP = {
        "safeguarding": "safeguarding.alert",
        "missing": "missing_episode.alert",
        "workflow": "workflow.escalation",
        "emotional_climate": "emotional_climate.shift",
        "operational_pressure": "operational_pressure.change",
        "placement": "placement.instability",
        "orb": "orb.summary",
        "care_hub": "care_hub.update",
    }

    def build_stream_snapshot(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        young_person_id: int | None = None,
        home_id: int | None = None,
        limit: int = 50,
    ) -> dict[str, Any]:
        started = time.perf_counter()
        feed = build_operational_feed(
            conn,
            young_person_id=young_person_id,
            home_id=home_id,
            limit=limit,
        )
        home_scope = home_id or self._infer_home_id(feed, current_user)
        climate = (feed.get("home_operational_intelligence") or {}).get("home_climate") or {}
        alerts = self._extract_stream_signals(feed, climate)
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        operational_metrics_service.observe_latency(
            "care_hub.stream_snapshot_ms",
            latency_ms,
            dimensions={"home_id": home_scope},
        )
        return {
            "ok": True,
            "generated_at": _now(),
            "scope": {
                "home_id": home_scope,
                "young_person_id": young_person_id,
                "provider_id": current_user.get("provider_id") or current_user.get("providerId"),
            },
            "event_count": feed.get("event_count"),
            "stream_signals": alerts,
            "live_climate": {
                "emotional_climate": climate.get("emotional_climate"),
                "safeguarding_pressure": climate.get("safeguarding_pressure"),
                "workforce_pressure": climate.get("workforce_pressure"),
            },
            "orb_operational_memory": (feed.get("orb_operational_memory") or {}).get("conversation_summary"),
            "latency_ms": latency_ms,
        }

    def propagate_feed_update(
        self,
        conn: Any,
        *,
        actor: dict[str, Any],
        young_person_id: int | None = None,
        home_id: int | None = None,
        transition_type: str = "care_hub_refresh",
        limit: int = 50,
    ) -> dict[str, Any]:
        snapshot = self.build_stream_snapshot(
            conn,
            current_user=actor,
            young_person_id=young_person_id,
            home_id=home_id,
            limit=limit,
        )
        home_scope = snapshot["scope"].get("home_id")
        if not home_scope:
            return {"ok": False, "reason": "home_scope_required", "snapshot": snapshot}

        results: list[dict[str, Any]] = []
        for signal in snapshot.get("stream_signals") or []:
            event_type = signal.get("realtime_type") or "care_hub.update"
            results.append(
                operational_event_bus.publish(
                    OperationalEvent(
                        domain="care_hub",
                        entity_type=signal.get("category") or "operational_signal",
                        entity_id=str(signal.get("id") or home_scope),
                        transition_type=transition_type,
                        home_id=home_scope,
                        actor=actor,
                        payload={
                            "young_person_id": young_person_id,
                            "signal": signal,
                            "stream_event_type": event_type,
                        },
                    )
                )
            )

        operational_metrics_service.increment(
            "realtime.stream.propagated",
            dimensions={"home_id": home_scope, "signal_count": len(snapshot.get("stream_signals") or [])},
        )
        return {"ok": True, "snapshot": snapshot, "propagation_results": results}

    def _extract_stream_signals(self, feed: dict[str, Any], climate: dict[str, Any]) -> list[dict[str, Any]]:
        signals: list[dict[str, Any]] = []
        events = feed.get("events") or []

        safeguarding_events = [event for event in events if event.get("safeguarding")]
        if safeguarding_events:
            signals.append(
                {
                    "id": "safeguarding-pressure",
                    "category": "safeguarding",
                    "realtime_type": self.STREAM_EVENT_MAP["safeguarding"],
                    "severity": (climate.get("safeguarding_pressure") or {}).get("state") or "watch",
                    "count": len(safeguarding_events),
                }
            )

        missing_events = [
            event
            for event in events
            if "missing" in (event.get("risk_tags") or []) or event.get("source_table") == "missing_episodes"
        ]
        if missing_events:
            signals.append(
                {
                    "id": "missing-episodes",
                    "category": "missing",
                    "realtime_type": self.STREAM_EVENT_MAP["missing"],
                    "severity": "high",
                    "count": len(missing_events),
                }
            )

        queue = feed.get("manager_queue") or {}
        workflow_items = [item for item in (queue.get("items") or []) if item.get("category") == "workflow"]
        if workflow_items:
            signals.append(
                {
                    "id": "workflow-escalation",
                    "category": "workflow",
                    "realtime_type": self.STREAM_EVENT_MAP["workflow"],
                    "severity": "medium",
                    "count": len(workflow_items),
                }
            )

        emotional = climate.get("emotional_climate") or {}
        if emotional.get("state") in {"unsettled", "elevated", "fragile"}:
            signals.append(
                {
                    "id": "emotional-climate",
                    "category": "emotional_climate",
                    "realtime_type": self.STREAM_EVENT_MAP["emotional_climate"],
                    "severity": emotional.get("state"),
                    "state": emotional.get("state"),
                }
            )

        workforce = climate.get("workforce_pressure") or {}
        if workforce.get("state") not in {None, "manageable", "stable"}:
            signals.append(
                {
                    "id": "workforce-pressure",
                    "category": "operational_pressure",
                    "realtime_type": self.STREAM_EVENT_MAP["operational_pressure"],
                    "severity": workforce.get("state"),
                    "queue_items": workforce.get("queue_items"),
                }
            )

        placement = (feed.get("home_operational_intelligence") or {}).get("placement_instability")
        if placement or (climate.get("safeguarding_pressure") or {}).get("state") == "unstable":
            signals.append(
                {
                    "id": "placement-instability",
                    "category": "placement",
                    "realtime_type": self.STREAM_EVENT_MAP["placement"],
                    "severity": "watch",
                }
            )

        orb_memory = feed.get("orb_operational_memory") or {}
        if orb_memory.get("conversation_summary"):
            signals.append(
                {
                    "id": "orb-summary",
                    "category": "orb",
                    "realtime_type": self.STREAM_EVENT_MAP["orb"],
                    "severity": "info",
                }
            )

        signals.append(
            {
                "id": "care-hub-refresh",
                "category": "care_hub",
                "realtime_type": self.STREAM_EVENT_MAP["care_hub"],
                "severity": "info",
                "event_count": feed.get("event_count"),
            }
        )
        return signals

    def _infer_home_id(self, feed: dict[str, Any], current_user: dict[str, Any]) -> int | None:
        events = feed.get("events") or []
        for event in events:
            home = event.get("home_id")
            if home not in (None, ""):
                try:
                    return int(home)
                except (TypeError, ValueError):
                    continue
        for key in ("home_id", "selected_home_id", "default_home_id"):
            value = current_user.get(key)
            if value not in (None, ""):
                try:
                    return int(value)
                except (TypeError, ValueError):
                    continue
        return None


realtime_operational_stream_service = RealtimeOperationalStreamService()
