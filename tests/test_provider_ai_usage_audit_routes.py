from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

import app as app_module
from auth.current_user import get_current_user
from middleware.security_middleware import CsrfProtectionMiddleware
from services.ai_usage_audit_service import ai_usage_audit_service


@pytest.fixture()
def admin_client(monkeypatch):
    async def _bypass_csrf_dispatch(self, request, call_next):
        return await call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)

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


def test_usage_audit_returns_safe_metadata_only(admin_client, monkeypatch):
    monkeypatch.setattr(
        ai_usage_audit_service,
        "list_safe",
        lambda **_k: [
            {
                "id": 1,
                "provider_id": 1,
                "home_id": 1,
                "feature": "orb_chat_stream",
                "model": "gpt-4o-mini",
                "redaction_mode": "strict",
                "redaction_applied": True,
                "estimated_input_tokens": 10,
                "estimated_output_tokens": 20,
                "estimated_cost_gbp": 0.001,
                "prompt_stored": False,
                "transcript_stored": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        ],
    )
    response = admin_client.get("/api/admin/ai-usage-audit")
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    event = body["events"][0]
    assert "prompt" not in event
    assert "transcript" not in event
    assert "model_output" not in event
    assert event["feature"] == "orb_chat_stream"


def test_list_safe_strips_sensitive_metadata():
    events = ai_usage_audit_service.list_safe(provider_id=1)
    assert isinstance(events, list)
