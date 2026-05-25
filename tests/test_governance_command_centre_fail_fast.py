from __future__ import annotations

import time
from unittest.mock import patch

import pytest

from routers import governance_intelligence_routes as governance_routes
from services.os_cache_service import os_cache_service
from services.os_circuit_breaker_service import os_circuit_breaker_service


@pytest.fixture(autouse=True)
def reset_state():
    os_cache_service.clear()
    os_circuit_breaker_service.clear()
    yield
    os_cache_service.clear()
    os_circuit_breaker_service.clear()


def test_pool_pressure_returns_degraded_under_500ms():
    current_user = {"id": 1, "role": "manager", "home_id": 3}
    with (
        patch.object(governance_routes, "is_pool_under_pressure", return_value=True),
        patch.object(
            governance_routes.governance_intelligence_service,
            "build_command_centre",
        ) as build,
        patch.object(
            governance_routes.projection_snapshot_service,
            "put",
        ) as put_snapshot,
    ):
        started = time.perf_counter()
        payload = governance_routes._build_governance_command_centre(
            current_user=current_user, days=14, home_id=3
        )
        elapsed_ms = (time.perf_counter() - started) * 1000
    assert elapsed_ms < 500
    assert payload["degraded"] is True
    build.assert_not_called()
    put_snapshot.assert_not_called()


def test_circuit_open_avoids_builder():
    current_user = {"id": 1, "role": "manager", "home_id": 3}
    os_circuit_breaker_service.record_failure("governance_command_centre", "timeout")
    os_circuit_breaker_service.record_failure("governance_command_centre", "timeout")
    os_circuit_breaker_service.record_failure("governance_command_centre", "timeout")
    with patch.object(
        governance_routes.governance_intelligence_service,
        "build_command_centre",
    ) as build:
        payload = governance_routes._build_governance_command_centre(
            current_user=current_user, days=14, home_id=3
        )
    assert payload.get("circuit_open") is True
    assert payload["degraded"] is True
    build.assert_not_called()
