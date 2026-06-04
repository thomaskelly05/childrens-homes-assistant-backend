from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app as app_module
from auth.current_user import get_current_user
from middleware.security_middleware import CsrfProtectionMiddleware
from services.provider_data_intelligence_settings_service import (
    provider_data_intelligence_settings_service,
)


def _client_for_role(monkeypatch, role: str, provider_id: int = 1):
    async def _bypass_csrf_dispatch(self, request, call_next):
        return await call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(
        provider_data_intelligence_settings_service,
        "_fetch_settings_rows",
        lambda *_a, **_k: (None, None),
    )

    def fake_user():
        return {
            "id": 10,
            "user_id": 10,
            "role": role,
            "email": f"{role}@test.com",
            "home_id": 1,
            "provider_id": provider_id,
        }

    app_module.app.dependency_overrides[get_current_user] = fake_user
    return TestClient(app_module.app)


@pytest.fixture(autouse=True)
def _cleanup_overrides():
    yield
    app_module.app.dependency_overrides.clear()


def test_staff_cannot_patch_settings(monkeypatch):
    client = _client_for_role(monkeypatch, "staff")
    response = client.patch(
        "/api/admin/ai-settings",
        json={"external_ai_enabled": True},
    )
    assert response.status_code == 403


def test_manager_can_read_but_not_patch(monkeypatch):
    client = _client_for_role(monkeypatch, "manager")
    get_resp = client.get("/api/admin/ai-settings")
    assert get_resp.status_code == 200
    patch_resp = client.patch("/api/admin/ai-settings", json={"external_ai_enabled": True})
    assert patch_resp.status_code == 403


def test_provider_admin_can_read(monkeypatch):
    client = _client_for_role(monkeypatch, "provider_admin")
    response = client.get("/api/admin/ai-settings")
    assert response.status_code == 200
    body = response.json()
    assert "effective" in body
    assert body["effective"]["external_ai_enabled"] is False
