from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app as app_module
from auth.current_user import get_current_user
from middleware.security_middleware import CsrfProtectionMiddleware
from services.provider_data_intelligence_settings_service import (
    provider_data_intelligence_settings_service,
)


@pytest.fixture()
def admin_client(monkeypatch):
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
    monkeypatch.setattr(
        provider_data_intelligence_settings_service,
        "upsert_settings",
        lambda **_k: {},
    )
    monkeypatch.setattr(
        provider_data_intelligence_settings_service,
        "write_settings_audit",
        lambda **_k: None,
    )

    def admin_user():
        return {
            "id": 5,
            "user_id": 5,
            "role": "admin",
            "email": "admin@test.com",
            "home_id": 1,
            "provider_id": 1,
        }

    app_module.app.dependency_overrides[get_current_user] = admin_user
    yield TestClient(app_module.app)
    app_module.app.dependency_overrides.clear()


def test_get_ai_trust_status(admin_client):
    response = admin_client.get("/api/admin/ai-trust-status")
    assert response.status_code == 200
    body = response.json()
    assert body["external_ai"] == "off"
    assert body["restricted_decisions"] == "blocked"
    assert body["human_review"] == "required"


def test_patch_external_ai_requires_acknowledgement(admin_client):
    response = admin_client.patch(
        "/api/admin/ai-settings",
        json={"external_ai_enabled": True},
    )
    assert response.status_code == 400


def test_patch_external_ai_with_acknowledgement(admin_client):
    response = admin_client.patch(
        "/api/admin/ai-settings",
        json={
            "external_ai_enabled": True,
            "acknowledgements": {
                "acknowledge_external_ai_processing": True,
                "acknowledge_subprocessor_terms": True,
                "acknowledge_human_review_required": True,
            },
        },
    )
    assert response.status_code == 200


def test_patch_redaction_off_requires_acknowledgement(admin_client):
    response = admin_client.patch(
        "/api/admin/ai-settings",
        json={"redaction_mode": "off"},
    )
    assert response.status_code == 400


def test_restricted_feature_rejected(admin_client):
    response = admin_client.patch(
        "/api/admin/ai-settings",
        json={"allowed_ai_features": ["safeguarding_decision"]},
    )
    assert response.status_code == 400
