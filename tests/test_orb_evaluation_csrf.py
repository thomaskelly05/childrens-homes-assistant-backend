"""CSRF enforcement for ORB Evaluation founder POST routes."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app as app_module
from auth.current_user import get_current_user

@pytest.fixture()
def csrf_enforced_founder_client(monkeypatch):
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)

    def founder_user():
        return {"id": 5, "role": "founder", "email": "founder@test.com", "home_id": 1}

    app_module.app.dependency_overrides[get_current_user] = founder_user
    yield TestClient(app_module.app)
    app_module.app.dependency_overrides.clear()


def _scenario_payload() -> dict:
    return {
        "id": "ORB-EVAL-CSRF-001",
        "domain": "safeguarding",
        "rolePerspective": "residential-worker",
        "category": "missing-from-home",
        "question": "Synthetic child Alex left Oakwood House without permission.",
        "expectedResponseFocus": ["police", "manager"],
        "requiredSafeguards": ["missing protocol"],
        "requiredRegulatoryAnchors": ["Regulation 27"],
        "requiredTone": ["calm"],
        "riskLevel": "critical",
        "adversarialFlags": [],
    }


def _run_payload() -> dict:
    return {
        "title": "CSRF internal-brain test",
        "mode": "internal-brain",
        "pack_type": "high-risk",
        "scenarios": [_scenario_payload()],
        "limit": 1,
    }


def test_internal_brain_post_succeeds_with_valid_session_and_csrf(csrf_enforced_founder_client: TestClient):
    csrf_token = "test-csrf-token-valid"
    csrf_enforced_founder_client.cookies.set("indicare_csrf", csrf_token)

    response = csrf_enforced_founder_client.post(
        "/orb/admin/evaluation/runs",
        headers={"x-csrf-token": csrf_token},
        json=_run_payload(),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload.get("success") is True
    data = payload.get("data") or {}
    assert data.get("mode") == "internal-brain"
    assert data.get("scenario_count", 0) >= 1


def test_internal_brain_post_fails_with_missing_csrf(csrf_enforced_founder_client: TestClient):
    csrf_enforced_founder_client.cookies.set("indicare_csrf", "test-csrf-token-missing-header")

    response = csrf_enforced_founder_client.post(
        "/orb/admin/evaluation/runs",
        json=_run_payload(),
    )

    assert response.status_code == 403
    assert response.json().get("detail") == "csrf_failed"


def test_internal_brain_post_fails_with_invalid_csrf(csrf_enforced_founder_client: TestClient):
    csrf_enforced_founder_client.cookies.set("indicare_csrf", "cookie-token")

    response = csrf_enforced_founder_client.post(
        "/orb/admin/evaluation/runs",
        headers={"x-csrf-token": "wrong-token"},
        json=_run_payload(),
    )

    assert response.status_code == 403
    assert response.json().get("detail") == "csrf_failed"


def test_live_llm_post_with_valid_csrf_is_not_csrf_blocked(csrf_enforced_founder_client: TestClient, monkeypatch):
    monkeypatch.setattr(
        "services.orb_evaluation_platform_service.live_llm_available",
        lambda: False,
    )
    csrf_token = "live-llm-csrf-token"
    csrf_enforced_founder_client.cookies.set("indicare_csrf", csrf_token)

    response = csrf_enforced_founder_client.post(
        "/orb/admin/evaluation/runs",
        headers={"x-csrf-token": csrf_token},
        json={
            "title": "Live LLM with valid CSRF",
            "mode": "live-llm",
            "pack_type": "standard",
            "scenarios": [_scenario_payload()],
            "limit": 1,
        },
    )

    assert response.status_code in {200, 400}
    assert response.json().get("detail") != "csrf_failed"
    if response.status_code == 200:
        data = response.json().get("data") or {}
        assert data.get("mode") == "live-llm"
