from __future__ import annotations

from collections import Counter, defaultdict, deque
from datetime import datetime, timezone
from statistics import mean
from typing import Any

from psycopg2.extras import Json


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class OperationalMetricsService:
    """Internal-only metrics for operational health without exposing care content."""

    def __init__(self) -> None:
        self._counters: Counter[str] = Counter()
        self._latencies: dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=200))
        self._events: deque[dict[str, Any]] = deque(maxlen=200)

    def increment(self, name: str, *, dimensions: dict[str, Any] | None = None, value: float = 1, conn: Any | None = None, request_id: str | None = None) -> dict[str, Any]:
        self._counters[name] += value
        event = {"name": name, "type": "counter", "value": value, "dimensions": self._safe_dimensions(dimensions), "created_at": _now()}
        self._events.append(event)
        self._persist(conn, event, request_id=request_id)
        return event

    def observe_latency(self, name: str, milliseconds: float, *, dimensions: dict[str, Any] | None = None, conn: Any | None = None, request_id: str | None = None) -> dict[str, Any]:
        value = max(0.0, float(milliseconds))
        self._latencies[name].append(value)
        event = {"name": name, "type": "latency_ms", "value": value, "dimensions": self._safe_dimensions(dimensions), "created_at": _now()}
        self._events.append(event)
        self._persist(conn, event, request_id=request_id)
        return event

    def health_summary(self) -> dict[str, Any]:
        latency = {
            name: {
                "count": len(values),
                "avg_ms": round(mean(values), 2) if values else 0,
                "max_ms": round(max(values), 2) if values else 0,
            }
            for name, values in self._latencies.items()
        }
        return {
            "ok": self._counters.get("export.failure", 0) == 0 and self._counters.get("upload.failure", 0) == 0,
            "queue_health": {key: value for key, value in self._counters.items() if key.startswith("queue.")},
            "websocket_health": {key: value for key, value in self._counters.items() if key.startswith("websocket.") or key.startswith("reconnect.")},
            "autosave_health": {key: value for key, value in self._counters.items() if key.startswith("autosave.")},
            "export_health": {key: value for key, value in self._counters.items() if key.startswith("export.")},
            "latency_metrics": latency,
            "recent_events": list(self._events)[-20:],
        }

    def reset_for_tests(self) -> None:
        self._counters.clear()
        self._latencies.clear()
        self._events.clear()

    def _persist(self, conn: Any | None, event: dict[str, Any], *, request_id: str | None) -> None:
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO operational_metrics (metric_name, metric_type, value, dimensions, request_id)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (event["name"], event["type"], event["value"], Json(event["dimensions"]), request_id),
            )

    def _safe_dimensions(self, dimensions: dict[str, Any] | None) -> dict[str, Any]:
        redacted = {"child_name", "young_person_name", "content", "prompt", "transcript", "text"}
        safe: dict[str, Any] = {}
        for key, value in (dimensions or {}).items():
            safe[key] = "[redacted]" if str(key).lower() in redacted else value
        return safe


operational_metrics_service = OperationalMetricsService()
