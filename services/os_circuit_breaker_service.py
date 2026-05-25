"""In-memory circuit breakers for dashboard endpoints under DB pressure."""

from __future__ import annotations

import logging
import os
import threading
import time
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger("indicare.os_circuit_breaker")

DEFAULT_KEYS = (
    "governance_command_centre",
    "ai_governance_dashboard",
    "operational_notification_feed_optional_sources",
    "recording_alert_badge",
    "inspection_readiness_dashboard",
    "reg45_dashboard",
)

CIRCUIT_FAILURE_THRESHOLD = int(os.getenv("OS_CIRCUIT_FAILURE_THRESHOLD", "3"))
CIRCUIT_OPEN_SECONDS = float(os.getenv("OS_CIRCUIT_OPEN_SECONDS", "45"))
CIRCUIT_HALF_OPEN_SECONDS = float(os.getenv("OS_CIRCUIT_HALF_OPEN_SECONDS", "15"))


@dataclass
class _CircuitState:
    failures: int = 0
    state: str = "closed"  # closed | open | half_open
    opened_at: float = 0.0
    last_failure_reason: str | None = None
    last_success_at: float | None = None


class OsCircuitBreakerService:
    """Per-key circuit breaker; no raw operational data stored."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._circuits: dict[str, _CircuitState] = {}

    def _circuit(self, key: str) -> _CircuitState:
        with self._lock:
            if key not in self._circuits:
                self._circuits[key] = _CircuitState()
            return self._circuits[key]

    def should_short_circuit(self, key: str) -> bool:
        circuit = self._circuit(key)
        now = time.time()
        with self._lock:
            if circuit.state == "open":
                if now - circuit.opened_at >= CIRCUIT_OPEN_SECONDS:
                    circuit.state = "half_open"
                    logger.info(
                        "circuit_half_open key=%s cooldown_seconds=%s",
                        key,
                        CIRCUIT_OPEN_SECONDS,
                    )
                    return False
                return True
            if circuit.state == "half_open":
                return False
            return False

    def record_success(self, key: str) -> None:
        with self._lock:
            circuit = self._circuits.setdefault(key, _CircuitState())
            circuit.failures = 0
            circuit.state = "closed"
            circuit.opened_at = 0.0
            circuit.last_failure_reason = None
            circuit.last_success_at = time.time()

    def record_failure(self, key: str, reason: str) -> None:
        circuit = self._circuit(key)
        with self._lock:
            circuit.failures += 1
            circuit.last_failure_reason = (reason or "unknown")[:200]
            if circuit.state == "half_open" or circuit.failures >= CIRCUIT_FAILURE_THRESHOLD:
                circuit.state = "open"
                circuit.opened_at = time.time()
                logger.warning(
                    "circuit_open key=%s failures=%s reason=%s",
                    key,
                    circuit.failures,
                    circuit.last_failure_reason,
                )

    def status(self, key: str) -> dict[str, Any]:
        circuit = self._circuit(key)
        with self._lock:
            return {
                "key": key,
                "state": circuit.state,
                "failures": circuit.failures,
                "circuit_open": circuit.state == "open",
                "last_failure_reason": circuit.last_failure_reason,
            }

    def clear(self) -> None:
        with self._lock:
            self._circuits.clear()


os_circuit_breaker_service = OsCircuitBreakerService()
