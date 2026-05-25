from __future__ import annotations

import pytest

from services.workforce_context_service import workforce_context_service


def test_build_dashboard_metadata_only(fake_state):
    user = fake_state["user"]
    secret = "RAW SUPERVISION NOTES MUST NOT LEAK"
    dashboard = workforce_context_service.build_dashboard(user, conn=None)
    dumped = dashboard.model_dump_json()
    assert secret not in dumped
    assert dashboard.shift is not None
    assert dashboard.privacy_notice
    assert dashboard.metadata.get("metadata_only") is True
    assert dashboard.recommendations


def test_shift_context_section_exists(fake_state):
    user = fake_state["user"]
    shift = workforce_context_service.build_shift_context(user, conn=None)
    assert shift.shift_label
    assert shift.route


def test_route_hints_when_data_unavailable(fake_state):
    user = fake_state["user"]
    staff = workforce_context_service.build_staff_on_shift(user, conn=None)
    assert staff
    unavailable = [i for i in staff if "unavailable" in i.safe_summary.lower() or i.source == "route_hint"]
    assert unavailable


def test_no_raw_hr_in_items(fake_state):
    user = fake_state["user"]
    dashboard = workforce_context_service.build_dashboard(user, conn=None)
    for item in (
        dashboard.training
        + dashboard.supervision
        + dashboard.wellbeing
        + dashboard.actions
    ):
        assert item.metadata.get("no_raw_body") is True
        assert "RAW" not in item.safe_summary.upper() or len(item.safe_summary) < 80


def test_wellbeing_manager_confidential(fake_state):
    user = fake_state["user"]
    user = {**user, "role": "manager"}
    items = workforce_context_service.build_wellbeing_indicators(user, conn=None)
    assert items
    assert items[0].sensitivity == "confidential"


def test_recommendations_exist(fake_state):
    user = fake_state["user"]
    dashboard = workforce_context_service.build_dashboard(user, conn=None)
    assert dashboard.recommendations


def test_health(fake_state):
    health = workforce_context_service.get_health(conn=None)
    assert health.status == "ok"
    assert health.metadata_only is True
