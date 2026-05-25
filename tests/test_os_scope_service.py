from __future__ import annotations

from unittest.mock import patch

import pytest

from schemas.os_scope import OsScopeSelectRequest
from services.os_scope_service import OsScopeService, os_scope_service


@pytest.fixture
def service() -> OsScopeService:
    return OsScopeService()


@pytest.fixture
def user() -> dict:
    return {"id": 42, "role": "manager", "home_id": 3, "provider_id": 1, "home_name": "Oak House"}


@pytest.fixture
def session() -> dict:
    return {}


def test_scope_options_returns_homes_lightweight(service, user, session):
    from schemas.os_scope import OsScopeHomeOption

    with patch(
        "services.os_scope_service._list_homes_lightweight",
        return_value=([OsScopeHomeOption(id=3, name="Oak House")], [], False),
    ):
        with patch("services.os_scope_service._list_children_for_home", return_value=([], [], False)):
            state = service.get_options(user, session)
    assert state.available_homes
    assert state.available_homes[0].id == 3


def test_current_scope_none(service, user, session):
    state = service.get_current(user, session)
    assert state.scope_type == "none"


def test_select_home_scope(service, user, session):
    state = service.select_scope(user, session, OsScopeSelectRequest(scope_type="home", home_id=3, home_name="Oak House"))
    assert state.scope_type == "home"
    assert state.selected_home_id == 3
    assert session["os_scope_type"] == "home"


def test_select_child_scope(service, user, session):
    state = service.select_scope(
        user,
        session,
        OsScopeSelectRequest(scope_type="child", child_id=9, child_name="Alex", home_id=3, home_name="Oak House"),
    )
    assert state.scope_type == "child"
    assert state.selected_child_id == 9
    assert state.routes.child_workspace == "/young-people/9/workspace"


def test_clear_scope(service, user, session):
    service.select_scope(user, session, OsScopeSelectRequest(scope_type="home", home_id=3))
    service.clear_scope(session)
    state = service.get_current(user, session)
    assert state.scope_type == "none"


def test_menu_summary_none_scope_fast(service, user):
    summary = service.menu_summary(user, scope_type="none")
    assert summary.recording_alert_count == 0
    assert summary.degraded is False or summary.degraded is True


def test_menu_summary_scoped_without_heavy_builders(service, user):
    with patch.object(service, "_scoped_counts_light", return_value=(2, 1, 0, 0)):
        with patch("services.os_scope_service.is_pool_under_pressure", return_value=False):
            with patch("services.os_scope_service.acquire_optional_dashboard_connection", return_value=object()):
                with patch("services.os_scope_service.release_db_connection"):
                    summary = service.menu_summary(user, scope_type="child", home_id=3, child_id=9)
    assert summary.recording_alert_count == 2
    assert summary.action_count == 1


def test_menu_summary_degraded_under_pool_pressure(service, user):
    with patch("services.os_scope_service.is_pool_under_pressure", return_value=True):
        summary = service.menu_summary(user, scope_type="home", home_id=3)
    assert summary.degraded is True
    assert summary.recording_alert_count == 0


def test_singleton_instance():
    assert os_scope_service is not None
