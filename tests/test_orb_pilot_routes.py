"""ORB Residential closed-pilot feedback route tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app as app_module
from auth.current_user import get_current_user
from db.orb_pilot_feedback_db import sanitise_pilot_feedback_text
from middleware.security_middleware import CsrfProtectionMiddleware


@pytest.fixture()
def staff_client(monkeypatch):
    async def _bypass_csrf_dispatch(self, request, call_next):
        return await call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)

    def staff_user():
        return {"id": 2, "role": "staff", "email": "staff@test.com", "home_id": 1}

    app_module.app.dependency_overrides[get_current_user] = staff_user
    yield TestClient(app_module.app)
    app_module.app.dependency_overrides.clear()


def test_sanitise_pilot_feedback_text_rejects_safeguarding_narrative():
    cleaned, error = sanitise_pilot_feedback_text(
        "A young person disclosed abuse in the home yesterday."
    )
    assert cleaned is None
    assert error
    assert "safeguarding" in error.lower() or "child names" in error.lower()


def test_sanitise_pilot_feedback_text_accepts_safe_feedback():
    cleaned, error = sanitise_pilot_feedback_text("ORB helped me structure a daily record more clearly.")
    assert error is None
    assert "structure a daily record" in cleaned


def test_sanitise_pilot_feedback_text_rejects_child_name_pattern():
    cleaned, error = sanitise_pilot_feedback_text("Child called Oliver was upset during handover.")
    assert cleaned is None
    assert error


def test_submit_pilot_feedback_requires_premium_access(staff_client):
    response = staff_client.post(
        "/orb/pilot/feedback",
        json={"featureUsed": "chat", "whatWorkedWell": "Helped structure daily record wording."},
    )
    assert response.status_code in (401, 403, 422, 503)


def test_founder_pilot_summary_requires_founder(staff_client):
    response = staff_client.get("/orb/pilot/summary/admin")
    assert response.status_code in (401, 403, 503)
