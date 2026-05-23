from __future__ import annotations

from pathlib import Path

import pytest

from routers import indicare_ai_governance_routes as governance_routes
from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service


@pytest.fixture(autouse=True)
def reset_events():
    indicare_ai_governance_event_service.reset_for_tests()
    yield
    indicare_ai_governance_event_service.reset_for_tests()


def test_health_route(fake_state):
    response = governance_routes.ai_governance_health(
        current_user=fake_state["user"],
        conn=None,
    )
    assert response["success"] is True
    assert "privacy_notice" in response["data"]


def test_dashboard_route(fake_state):
    response = governance_routes.ai_governance_dashboard(
        period="7d",
        limit=25,
        current_user=fake_state["user"],
        conn=None,
    )
    assert response["success"] is True
    assert "summary" in response["data"]


def test_events_route(fake_state):
    response = governance_routes.ai_governance_events(
        period="7d",
        limit=50,
        current_user=fake_state["user"],
        conn=None,
    )
    assert response["success"] is True
    assert "events" in response["data"]


def test_alerts_route(fake_state):
    response = governance_routes.ai_governance_alerts(
        period="7d",
        current_user=fake_state["user"],
        conn=None,
    )
    assert response["success"] is True


def test_sources_outputs_costs_quality_routes(fake_state):
    for handler in (
        governance_routes.ai_governance_sources,
        governance_routes.ai_governance_outputs,
        governance_routes.ai_governance_costs,
        governance_routes.ai_governance_quality,
    ):
        kwargs = {"current_user": fake_state["user"], "conn": None}
        if handler in (governance_routes.ai_governance_costs, governance_routes.ai_governance_quality):
            kwargs["period"] = "7d"
        payload = handler(**kwargs)
        assert payload["success"] is True


def test_governance_router_registered():
    loader = Path(__file__).resolve().parents[1] / "core" / "router_loader.py"
    assert "routers.indicare_ai_governance_routes" in loader.read_text(encoding="utf-8")
