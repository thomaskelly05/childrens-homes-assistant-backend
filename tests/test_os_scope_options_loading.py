from __future__ import annotations

from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest

from schemas.os_scope import OsScopeHomeOption, OsScopeState, scope_state_to_dict
from services.os_scope_service import HomeAccessResolution, OsScopeService


@pytest.fixture
def service() -> OsScopeService:
    return OsScopeService()


@pytest.fixture
def user() -> dict:
    return {
        "id": 42,
        "role": "manager",
        "home_id": 3,
        "provider_id": 1,
        "home_name": "Oak House",
        "allowed_home_ids": [3, 7],
    }


@pytest.fixture
def session() -> dict:
    return {}


def test_scope_options_stable_arrays(service, user, session):
    from services.os_cache_service import os_cache_service

    os_cache_service.invalidate_prefix("os_scope:options:")
    access = HomeAccessResolution("allowed_home_ids", "ids", home_ids=(3, 7))
    with patch("services.os_scope_service._list_homes_lightweight", return_value=([OsScopeHomeOption(id=3, name="Oak")], [], False, access)):
        with patch("services.os_scope_service._list_children_for_home", return_value=([], [], False)):
            state = service.get_options(user, session)
    payload = scope_state_to_dict(state)
    assert isinstance(payload["available_homes"], list)
    assert isinstance(payload["available_children"], list)
    assert isinstance(payload["recent_homes"], list)
    assert isinstance(payload["recent_children"], list)
    assert payload["degraded"] is False


def test_scope_options_degraded_on_db_busy(service, user, session):
    from services.os_cache_service import os_cache_service

    os_cache_service.invalidate_prefix("os_scope:options:")
    access = HomeAccessResolution("allowed_home_ids", "ids", home_ids=(3, 7))
    with patch("services.os_scope_service._list_homes_lightweight", return_value=([], ["Home and child list unavailable. Retry shortly."], True, access)):
        with patch("services.os_scope_service._list_children_for_home", return_value=([], [], False)):
            state = service.get_options(user, session)
    assert state.degraded is True
    assert state.available_homes == []
    assert state.available_children == []


def test_scope_options_children_only_after_home_selected(service, user, session):
    from services.os_cache_service import os_cache_service

    os_cache_service.invalidate_prefix("os_scope:options:")
    access = HomeAccessResolution("allowed_home_ids", "ids", home_ids=(3, 7))
    with patch("services.os_scope_service._list_homes_lightweight", return_value=([OsScopeHomeOption(id=3, name="Oak")], [], False, access)):
        with patch("services.os_scope_service._list_children_for_home") as child_mock:
            service.get_options(user, session)
    child_mock.assert_not_called()

    os_cache_service.invalidate_prefix("os_scope:options:")
    with patch("services.os_scope_service._list_homes_lightweight", return_value=([OsScopeHomeOption(id=3, name="Oak")], [], False, access)):
        with patch("services.os_scope_service._list_children_for_home", return_value=([], [], False)) as child_mock:
            service.get_options(user, session, home_id=3)
    child_mock.assert_called_once()


def test_list_homes_uses_context_manager_not_generator(user):
    from services import os_scope_service as mod

    fake_conn = MagicMock()
    fake_cur = MagicMock()
    fake_conn.cursor.return_value.__enter__.return_value = fake_cur
    fake_cur.fetchone.return_value = {"exists": False}

    @contextmanager
    def fake_acquire(*args, **kwargs):
        yield fake_conn

    with patch.object(mod, "is_pool_under_pressure", return_value=False):
        with patch.object(mod, "acquire_optional_dashboard_connection", fake_acquire):
            with patch.object(mod, "release_db_connection"):
                homes, warnings, degraded, _access = mod._list_homes_lightweight(user)
    assert isinstance(homes, list)
    assert not any(home.name == "Current home" for home in homes)


def test_acquire_optional_dashboard_connection_used_with_with():
    import inspect
    from services import os_scope_service as mod

    source = inspect.getsource(mod._list_homes_lightweight)
    assert "with acquire_optional_dashboard_connection" in source
    source_children = inspect.getsource(mod._list_children_for_home)
    assert "with acquire_optional_dashboard_connection" in source_children
