from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import app as app_module
from schemas.os_scope import OsScopeMenuSummary
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



def test_menu_summary_accepts_scope_query_params(client):
    summary = OsScopeMenuSummary(scope_type="child", home_id=3, child_id=9, action_count=2)
    with patch("routers.os_scope_routes.os_scope_service.menu_summary", return_value=summary) as menu:
        response = client.get("/api/os/menu-summary?scope_type=child&home_id=3&child_id=9")
    assert response.status_code == 200
    menu.assert_called_once()
    kwargs = menu.call_args.kwargs
    assert kwargs["scope_type"] == "child"
    assert kwargs["home_id"] == 3
    assert kwargs["child_id"] == 9


def test_menu_summary_does_not_call_governance_builder(client):
    with patch("routers.os_scope_routes.os_scope_service.menu_summary", return_value=OsScopeMenuSummary()) as menu:
        client.get("/api/os/menu-summary?scope_type=home&home_id=3")
    assert "governance" not in str(menu.call_args)


def test_menu_summary_returns_degraded_json_when_service_fails(client):
    with patch(
        "routers.os_scope_routes.os_scope_service.menu_summary",
        side_effect=RuntimeError("db timeout"),
    ):
        response = client.get("/api/os/menu-summary")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["data"]["scope_type"] == "none"
    assert body["data"]["degraded"] is True
