from __future__ import annotations

from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest

from schemas.os_scope import OsScopeChildOption, OsScopeHomeOption
from services import os_scope_service as mod
from services.os_scope_service import HomeAccessResolution, OsScopeService, _resolve_home_access


@pytest.fixture
def service() -> OsScopeService:
    return OsScopeService()


@pytest.fixture
def session() -> dict:
    return {}


def _mock_conn_with_homes(rows: list[dict]) -> MagicMock:
    fake_conn = MagicMock()
    fake_cur = MagicMock()
    fake_conn.cursor.return_value.__enter__.return_value = fake_cur

    def fetchone_side_effect():
        return {"exists": True}

    fake_cur.fetchone.side_effect = [
        {"exists": True},
        {"column_name": "id"},
        {"column_name": "name"},
        {"column_name": "provider_id"},
        {"column_name": "status"},
        {"column_name": "archived"},
    ]
    fake_cur.fetchall.side_effect = [
        [{"column_name": "id"}, {"column_name": "name"}, {"column_name": "provider_id"}, {"column_name": "status"}, {"column_name": "archived"}],
        rows,
    ]
    return fake_conn


def test_admin_platform_sees_all_active_homes():
    user = {"id": 1, "role": "admin", "home_id": 1}
    access = _resolve_home_access(user)
    assert access.source == "admin_all_homes"
    assert access.mode == "all_active"


def test_owner_sees_all_active_homes():
    user = {"id": 2, "role": "owner", "home_id": 1}
    access = _resolve_home_access(user)
    assert access.source == "admin_all_homes"
    assert access.mode == "all_active"


def test_provider_user_provider_scope():
    user = {"id": 3, "role": "provider_admin", "provider_id": 9, "home_id": 1, "allowed_home_ids": [1, 2]}
    access = _resolve_home_access(user)
    assert access.source == "provider_scope"
    assert access.mode == "provider"
    assert access.provider_id == 9


def test_staff_assigned_home_only():
    user = {"id": 4, "role": "support_worker", "home_id": 7, "allowed_home_ids": [7]}
    access = _resolve_home_access(user)
    assert access.source == "assigned_home"
    assert access.mode == "ids"
    assert access.home_ids == (7,)


def test_explicit_allowed_home_ids():
    user = {"id": 5, "role": "manager", "home_id": 3, "allowed_home_ids": [3, 7, 11]}
    access = _resolve_home_access(user)
    assert access.source == "allowed_home_ids"
    assert access.home_ids == (3, 7, 11)


def test_no_permissions_empty_state():
    user = {"id": 6, "role": "viewer", "home_id": None, "allowed_home_ids": []}
    access = _resolve_home_access(user)
    assert access.source == "none"
    assert access.mode == "none"


def test_list_homes_admin_returns_all_from_db():
    user = {"id": 1, "role": "admin", "home_id": 1}
    rows = [
        {"id": 1, "name": "North Star House", "status": "active", "provider_id": 1},
        {"id": 2, "name": "Aoollo House", "status": "active", "provider_id": 1},
        {"id": 9101, "name": "Maple House", "status": "active", "provider_id": 1},
    ]
    fake_conn = _mock_conn_with_homes(rows)

    @contextmanager
    def fake_acquire(*args, **kwargs):
        yield fake_conn

    with patch.object(mod, "is_pool_under_pressure", return_value=False):
        with patch.object(mod, "acquire_optional_dashboard_connection", fake_acquire):
            with patch.object(mod, "release_db_connection"):
                with patch.object(mod, "_fetch_assigned_home_ids_from_db", return_value=()):
                    homes, warnings, degraded, access = mod._list_homes_lightweight(user)

    assert access.source == "admin_all_homes"
    assert len(homes) == 3
    assert {home.id for home in homes} == {1, 2, 9101}
    assert all(home.route == f"/homes/{home.id}/workspace" for home in homes)


def test_home_without_children_still_listed(service, session):
    user = {"id": 1, "role": "admin", "home_id": 1}
    homes = [
        OsScopeHomeOption(id=1, name="North Star", route="/homes/1/workspace"),
        OsScopeHomeOption(id=2, name="Empty Home", route="/homes/2/workspace"),
    ]
    with patch("services.os_scope_service._list_homes_lightweight", return_value=(homes, [], False, HomeAccessResolution("admin_all_homes", "all_active"))):
        with patch("services.os_scope_service._list_children_for_home", return_value=([], ["No children are currently available for this home."], False)):
            state = service.get_options(user, session, home_id=2)
    assert len(state.available_homes) == 2
    assert state.available_children == []


def test_children_only_for_selected_home(service, session):
    user = {"id": 4, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    children = [OsScopeChildOption(id=10, name="Jamie", home_id=1)]
    with patch("services.os_scope_service._list_homes_lightweight", return_value=([OsScopeHomeOption(id=1, name="North Star")], [], False, HomeAccessResolution("assigned_home", "ids", home_ids=(1,)))):
        with patch("services.os_scope_service._list_children_for_home", return_value=(children, [], False)) as child_mock:
            state = service.get_options(user, session, home_id=1)
    child_mock.assert_called_once()
    assert state.available_children[0].home_id == 1


def test_children_not_loaded_before_home_selected(service, session):
    user = {"id": 1, "role": "admin", "home_id": 1}
    with patch("services.os_scope_service._list_homes_lightweight", return_value=([OsScopeHomeOption(id=1, name="North Star")], [], False, HomeAccessResolution("admin_all_homes", "all_active"))):
        with patch("services.os_scope_service._list_children_for_home") as child_mock:
            state = service.get_options(user, session)
    child_mock.assert_not_called()
    assert state.available_children == []


def test_admin_metadata_in_options(service, session):
    user = {"id": 1, "role": "admin", "home_id": 1}
    with patch("services.os_scope_service._list_homes_lightweight", return_value=([OsScopeHomeOption(id=1, name="North Star")], [], False, HomeAccessResolution("admin_all_homes", "all_active"))):
        with patch("services.os_scope_service._list_children_for_home", return_value=([], [], False)):
            state = service.get_options(user, session, home_id=1)
    assert state.metadata.get("home_access_source") == "admin_all_homes"
    assert state.metadata.get("home_count") == 1
    assert state.metadata.get("selected_home_id") == 1


def test_staff_no_admin_metadata(service, session):
    user = {"id": 4, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    with patch("services.os_scope_service._list_homes_lightweight", return_value=([OsScopeHomeOption(id=1, name="North Star")], [], False, HomeAccessResolution("assigned_home", "ids", home_ids=(1,)))):
        with patch("services.os_scope_service._list_children_for_home", return_value=([], [], False)):
            state = service.get_options(user, session)
    assert state.metadata == {}
