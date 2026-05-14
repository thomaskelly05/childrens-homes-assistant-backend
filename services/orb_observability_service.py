from __future__ import annotations

import os
import socket
import time
import uuid
from collections import Counter, deque
from datetime import datetime, timezone
from statistics import mean
from typing import Any


SENSITIVE_KEYS = {
    "text",
    "transcript",
    "prompt",
    "audio",
    "raw_audio",
    "child_name",
    "young_person_name",
    "content",
}


def new_request_id(prefix: str = "orb_req") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def worker_id() -> str:
    return os.getenv("ORB_WORKER_ID") or os.getenv("HOSTNAME") or socket.gethostname()


def _safe_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    if not metadata:
        return {}
    safe: dict[str, Any] = {}
    for key, value in metadata.items():
        if str(key).lower() in SENSITIVE_KEYS:
            safe[key] = "[redacted]"
        elif isinstance(value, dict):
            safe[key] = _safe_metadata(value)
        elif isinstance(value, list):
            safe[key] = f"{len(value)} item(s)"
        else:
            safe[key] = value
    return safe


class OrbObservabilityService:
    """Privacy-preserving operational metrics for Orb realtime reliability."""

    def __init__(self) -> None:
        self._counters: Counter[str] = Counter()
        self._latencies: dict[str, deque[float]] = {
            "provider_latency_ms": deque(maxlen=200),
            "interruption_latency_ms": deque(maxlen=200),
            "speaking_duration_ms": deque(maxlen=200),
        }
        self._recent_events: deque[dict[str, Any]] = deque(maxlen=100)
        self._provider_status: dict[str, Any] = {
            "state": "unknown",
            "last_failure": None,
            "last_success_at": None,
        }
        self._started_at = datetime.now(timezone.utc).isoformat()

    def reset_for_tests(self) -> None:
        self._counters.clear()
        for values in self._latencies.values():
            values.clear()
        self._recent_events.clear()
        self._provider_status = {"state": "unknown", "last_failure": None, "last_success_at": None}

    def record_event(
        self,
        event: str,
        *,
        session_id: str | None = None,
        user_id: int | str | None = None,
        home_id: int | str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        request_id = new_request_id()
        self._counters[event] += 1
        self._recent_events.append(
            {
                "request_id": request_id,
                "event": event,
                "session_id": session_id,
                "user_id": str(user_id) if user_id is not None else None,
                "home_id": str(home_id) if home_id is not None else None,
                "worker_id": worker_id(),
                "metadata": _safe_metadata(metadata),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        return request_id

    def record_latency(self, metric: str, value_ms: float) -> None:
        self._latencies.setdefault(metric, deque(maxlen=200)).append(float(value_ms))

    def record_provider_success(self, latency_ms: float | None = None) -> None:
        self._provider_status["state"] = "healthy"
        self._provider_status["last_success_at"] = datetime.now(timezone.utc).isoformat()
        self._provider_status["last_failure"] = None
        self._counters["provider_success"] += 1
        if latency_ms is not None:
            self.record_latency("provider_latency_ms", latency_ms)

    def record_provider_failure(self, reason: str, *, retryable: bool = True, status: int | None = None) -> None:
        self._provider_status["state"] = "degraded" if retryable else "unavailable"
        self._provider_status["last_failure"] = {
            "reason": reason,
            "retryable": retryable,
            "status": status,
            "at": datetime.now(timezone.utc).isoformat(),
        }
        self._counters[f"provider_failure.{reason}"] += 1

    def record_websocket_disconnect(self, *, session_id: str | None, reason: str) -> None:
        self.record_event("websocket_disconnect", session_id=session_id, metadata={"reason": reason})

    def record_reconnect_attempt(self, *, session_id: str | None, attempt: int, reason: str | None = None) -> None:
        self.record_event("reconnect_attempt", session_id=session_id, metadata={"attempt": attempt, "reason": reason})
        if attempt >= int(os.getenv("ORB_RECONNECT_STORM_THRESHOLD", "5")):
            self._counters["reconnect_storms"] += 1

    def metrics(self) -> dict[str, Any]:
        latency = {}
        for key, values in self._latencies.items():
            if not values:
                latency[key] = {"count": 0}
                continue
            latency[key] = {
                "count": len(values),
                "avg_ms": round(mean(values), 2),
                "max_ms": round(max(values), 2),
            }
        return {
            "worker_id": worker_id(),
            "started_at": self._started_at,
            "counters": dict(self._counters),
            "latency": latency,
            "recent_events": list(self._recent_events)[-20:],
            "privacy": {
                "raw_transcripts_logged": False,
                "raw_prompts_logged": False,
                "raw_audio_logged": False,
                "identifiable_child_data_logged": False,
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def health(self) -> dict[str, Any]:
        counters = dict(self._counters)
        stuck_states = counters.get("stuck_state_recovered", 0)
        reconnect_storms = counters.get("reconnect_storms", 0)
        return {
            "ok": self._provider_status.get("state") not in {"unavailable"} and reconnect_storms == 0,
            "worker_id": worker_id(),
            "provider": self.provider_status(),
            "stuck_state_recoveries": stuck_states,
            "reconnect_storms": reconnect_storms,
            "privacy_safe": True,
        }

    def provider_status(self) -> dict[str, Any]:
        status = dict(self._provider_status)
        status["worker_id"] = worker_id()
        status["monotonic_time"] = round(time.monotonic(), 2)
        return status


orb_observability_service = OrbObservabilityService()
