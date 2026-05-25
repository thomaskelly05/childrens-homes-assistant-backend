from __future__ import annotations

import pytest

from services.staff_profile_os_service import staff_profile_os_service


def test_build_dashboard_metadata_only(fake_state):
    user = fake_state["user"]
    staff_id = int(user["id"])
    secret = "RAW SUPERVISION NOTES MUST NOT LEAK INTO CARDS"
    dashboard = staff_profile_os_service.build_dashboard(staff_id, user, conn=None)
    dumped = dashboard.model_dump_json()
    assert secret not in dumped
    assert dashboard.overview.staff_name
    assert dashboard.sections
    assert dashboard.routes.profile == f"/staff/{staff_id}"
    assert dashboard.privacy_notice
    assert dashboard.recommendations
    assert dashboard.metadata.get("metadata_only") is True


def test_overview_exists(fake_state):
    user = fake_state["user"]
    staff_id = int(user["id"])
    overview = staff_profile_os_service.build_overview(staff_id, user, conn=None)
    assert overview.staff_id == staff_id
    assert overview.profile_route == f"/staff/{staff_id}"


def test_route_hints_exist(fake_state):
    user = fake_state["user"]
    staff_id = int(user["id"])
    routes = staff_profile_os_service.route_hints(staff_id)
    assert routes.training_matrix.endswith(f"staff_id={staff_id}")
    assert routes.supervision.endswith(f"staff_id={staff_id}")


def test_training_supervision_probation_counts_only(fake_state):
    user = fake_state["user"]
    staff_id = int(user["id"])
    dashboard = staff_profile_os_service.build_dashboard(staff_id, user, conn=None)
    for section in dashboard.sections:
        for item in section.items:
            assert item.metadata.get("no_raw_body") is True
            assert "RAW SUPERVISION" not in item.safe_summary.upper()


def test_wellbeing_confidential_safe_only(fake_state):
    user = {**fake_state["user"], "role": "manager"}
    staff_id = int(user["id"])
    section = staff_profile_os_service.build_wellbeing_section(staff_id, user, conn=None)
    assert section.items
    assert section.items[0].sensitivity == "confidential"
    assert section.items[0].metadata.get("summary_only") is True


def test_access_conservative(fake_state):
    user = {**fake_state["user"], "role": "staff", "id": 99, "user_id": 99}
    with pytest.raises(Exception):
        staff_profile_os_service.enforce_access(5, user)


def test_health(fake_state):
    health = staff_profile_os_service.get_health(conn=None)
    assert health.status == "ok"
    assert health.metadata_only is True
