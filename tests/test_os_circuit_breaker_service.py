from __future__ import annotations

import time

from services.os_circuit_breaker_service import OsCircuitBreakerService


def test_circuit_opens_after_failures():
    service = OsCircuitBreakerService()
    key = "governance_command_centre"
    for _ in range(3):
        service.record_failure(key, "timeout")
    assert service.should_short_circuit(key) is True
    status = service.status(key)
    assert status["circuit_open"] is True


def test_circuit_closes_on_success():
    service = OsCircuitBreakerService()
    key = "ai_governance_dashboard"
    service.record_failure(key, "busy")
    service.record_failure(key, "busy")
    service.record_failure(key, "busy")
    assert service.should_short_circuit(key) is True
    service.record_success(key)
    assert service.should_short_circuit(key) is False


def test_half_open_after_cooldown(monkeypatch):
    service = OsCircuitBreakerService()
    key = "reg45_dashboard"
    monkeypatch.setattr("services.os_circuit_breaker_service.CIRCUIT_OPEN_SECONDS", 0.05)
    for _ in range(3):
        service.record_failure(key, "db")
    assert service.should_short_circuit(key) is True
    time.sleep(0.06)
    assert service.should_short_circuit(key) is False
