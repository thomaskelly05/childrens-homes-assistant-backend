from __future__ import annotations

import time
from unittest.mock import patch

from services.indicare_ai_governance_dashboard_service import indicare_ai_governance_dashboard_service
from services.os_cache_service import os_cache_service
from services.os_circuit_breaker_service import os_circuit_breaker_service
from schemas.indicare_ai_governance import AiGovernanceFilter


def test_pool_pressure_returns_degraded_without_db_probe():
    os_cache_service.clear()
    os_circuit_breaker_service.clear()
    filters = AiGovernanceFilter()
    current_user = {"id": 1, "role": "manager", "home_id": 1}
    with (
        patch.object(
            indicare_ai_governance_dashboard_service,
            "build_usage_metrics",
        ) as usage,
        patch(
            "services.indicare_ai_governance_dashboard_service.is_pool_under_pressure",
            return_value=True,
        ),
    ):
        started = time.perf_counter()
        dashboard = indicare_ai_governance_dashboard_service.build_dashboard(
            filters, current_user, conn=None
        )
        elapsed_ms = (time.perf_counter() - started) * 1000
    assert elapsed_ms < 500
    assert dashboard.degraded is True
    usage.assert_not_called()


def test_circuit_open_serves_degraded():
    os_circuit_breaker_service.clear()
    for _ in range(3):
        os_circuit_breaker_service.record_failure("ai_governance_dashboard", "busy")
    filters = AiGovernanceFilter()
    dashboard = indicare_ai_governance_dashboard_service.build_dashboard(
        filters, {"id": 1}, conn=None
    )
    assert dashboard.degraded is True
