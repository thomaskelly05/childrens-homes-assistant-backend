from __future__ import annotations

import time
from unittest.mock import patch

import pytest

from db.connection import DatabaseUnavailableError
from routers import governance_intelligence_routes as governance_routes
from services.os_cache_service import os_cache_service


@pytest.fixture(autouse=True)
def clear_governance_cache():
    os_cache_service.clear()
    yield
    os_cache_service.clear()


def test_governance_command_centre_cache_hit_avoids_rebuild():
    current_user = {"id": 1, "role": "manager", "home_id": 3}
    payload = {"ok": True, "summary": {"governance_risk": "low"}, "governance_actions": []}

    with patch.object(
        governance_routes.governance_intelligence_service,
        "build_command_centre",
        return_value=payload,
    ) as build:
        first = governance_routes._build_governance_command_centre(
            current_user=current_user, days=14, home_id=3
        )
        second = governance_routes._build_governance_command_centre(
            current_user=current_user, days=14, home_id=3
        )

    assert first["cache_status"] in {"miss", "hit"}
    assert second["cache_status"] == "hit"
    assert build.call_count == 1


def test_governance_command_centre_returns_degraded_when_db_busy():
    current_user = {"id": 1, "role": "manager", "home_id": 3}
    stale = {"ok": True, "summary": {}, "degraded": False}
    key = governance_routes._memory_cache_key(current_user, days=14, home_id=3)
    os_cache_service.set(key, {**stale, "degraded": True}, ttl_seconds=0.01, stale_ttl_seconds=60)
    time.sleep(0.02)

    with (
        patch.object(governance_routes, "is_pool_under_pressure", return_value=True),
        patch.object(
            governance_routes.governance_intelligence_service,
            "build_command_centre",
            side_effect=DatabaseUnavailableError("busy"),
        ),
    ):
        payload = governance_routes._build_governance_command_centre(
            current_user=current_user, days=14, home_id=3
        )

    assert payload["degraded"] is True
    assert payload["cache_status"] == "stale"


def test_governance_build_respects_section_budget():
    from services.governance_intelligence_service import GovernanceIntelligenceService

    service = GovernanceIntelligenceService()
    current_user = {"id": 1, "role": "manager", "home_id": 3}

    with (
        patch.object(service.manager, "build_dashboard", side_effect=lambda **_: time.sleep(2) or {}),
        patch.object(service.workspace, "home_workspace", return_value={}),
        patch.object(service.evidence, "build_home_evidence", return_value={"cards": [], "gaps": []}),
        patch.object(service.provider, "build_dashboard", return_value={"homes": [], "summary": {}}),
        patch.object(service, "build_reg44_workflow", return_value={}),
        patch.object(service.workforce, "command_centre", return_value={}),
        patch.object(service.workforce, "orb_context", return_value={}),
        patch("services.governance_intelligence_service.is_pool_under_pressure", return_value=False),
    ):
        started = time.perf_counter()
        payload = service.build_command_centre(current_user=current_user, days=14, home_id=3)
        elapsed = time.perf_counter() - started

    assert elapsed < 2.5
    assert payload.get("degraded") is True
    assert payload.get("section_status", {}).get("manager", {}).get("timed_out") is True
