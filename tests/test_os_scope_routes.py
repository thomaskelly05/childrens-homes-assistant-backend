from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import app as app_module
from schemas.os_scope import OsScopeState
from middleware.security_middleware import CsrfProtectionMiddleware


@pytest.fixture()
def client(monkeypatch):
    async def _bypass_csrf_dispatch(self, request, call_next):
        return await call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)
    from auth.dependencies import get_current_user

    def fake_user(request=None, bearer_token=None):
        return {"id": 1, "role": "manager", "home_id": 3, "email": "m@test.local"}

    app_module.app.dependency_overrides[get_current_user] = fake_user
    yield TestClient(app_module.app)
    app_module.app.dependency_overrides.clear()



def test_scope_options_route(client):
    payload = OsScopeState(scope_type="none", available_homes=[], available_children_for_home=[]).model_dump()
    with patch("routers.os_scope_routes.os_scope_service.get_options", return_value=OsScopeState.model_validate(payload)):
        response = client.get("/api/os/scope/options")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert "data" in body


def test_scope_current_route(client):
    with patch(
        "routers.os_scope_routes.os_scope_service.get_current",
        return_value=OsScopeState(scope_type="home", selected_home_id=3, selected_home_name="Oak"),
    ):
        response = client.get("/api/os/scope/current")
    assert response.status_code == 200
    assert response.json()["data"]["scope_type"] == "home"


def test_scope_select_route(client):
    with patch(
        "routers.os_scope_routes.os_scope_service.select_scope",
        return_value=OsScopeState(scope_type="child", selected_child_id=9, selected_home_id=3),
    ):
        response = client.post(
            "/api/os/scope/select",
            json={"scope_type": "child", "child_id": 9, "home_id": 3, "child_name": "Alex"},
        )
    assert response.status_code == 200
    assert response.json()["data"]["scope_type"] == "child"


def test_menu_summary_route(client):
    from schemas.os_scope import OsScopeMenuSummary

    with patch(
        "routers.os_scope_routes.os_scope_service.menu_summary",
        return_value=OsScopeMenuSummary(scope_type="child", child_id=9, home_id=3, recording_alert_count=1),
    ):
        response = client.get("/api/os/menu-summary?scope_type=child&child_id=9&home_id=3")
    assert response.status_code == 200
    assert response.json()["data"]["recording_alert_count"] == 1
