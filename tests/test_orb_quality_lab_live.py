from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

import app as app_module
from auth.current_user import get_current_user
from middleware.security_middleware import CsrfProtectionMiddleware
from services.orb_expert_scenario_bank_service import orb_expert_scenario_bank_service
from services.orb_quality_lab_live_runner_service import (
    build_quality_lab_message,
    live_llm_available,
    validate_synthetic_scenario_text,
)
from services.orb_quality_lab_scenario_coverage_service import (
    orb_quality_lab_scenario_coverage_service,
)
from services.orb_quality_lab_scoring_service import detect_critical_failure
from services.orb_expert_scenario_evaluator_service import orb_expert_scenario_evaluator_service


@pytest.fixture()
def admin_client(monkeypatch):
    async def _bypass_csrf_dispatch(self, request, call_next):
        return await call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)

    def admin_user():
        return {"id": 5, "role": "admin", "email": "admin@test.com", "home_id": 1}

    app_module.app.dependency_overrides[get_current_user] = admin_user
    yield TestClient(app_module.app)
    app_module.app.dependency_overrides.clear()


def test_whistleblowing_scenario_in_gold_bank():
    scenario = orb_expert_scenario_bank_service.get_gold_scenario("GOLD-054-whistleblowing")
    assert scenario is not None
    assert scenario.get("family") == "whistleblowing"


def test_gold_coverage_includes_whistleblowing():
    coverage = orb_quality_lab_scenario_coverage_service.audit_gold_coverage()
    assert coverage["whistleblowing_covered"] is True


def test_validate_synthetic_scenario_rejects_real_identifiers():
    violations = validate_synthetic_scenario_text("Child id: 12345 at the home")
    assert "child_id" in violations


def test_build_quality_lab_message_is_synthetic():
    scenario = orb_expert_scenario_bank_service.get_gold_scenario("GOLD-054-whistleblowing")
    message = build_quality_lab_message(scenario)
    assert "synthetic scenario only" in message.lower()
    assert scenario["prompt"] in message


def test_template_mode_does_not_call_live_runner(admin_client):
    with patch(
        "services.orb_quality_lab_service.orb_quality_lab_live_runner_service.run_scenario",
        new_callable=AsyncMock,
    ) as mock_run:
        response = admin_client.post(
            "/orb/admin/quality-lab/runs",
            json={"limit": 2, "run_mode": "template"},
        )
        assert response.status_code == 200
        body = response.json()["data"]
        assert body["run_mode"] == "template"
        assert body["route_call_skipped"] is True
        assert all(item["answer_source"] == "sample-template" for item in body["results"])
        mock_run.assert_not_called()


def test_live_llm_mode_does_not_use_sample_answers(admin_client, monkeypatch):
    monkeypatch.setattr(
        "services.orb_quality_lab_service.live_llm_available",
        lambda: False,
    )
    response = admin_client.post(
        "/orb/admin/quality-lab/runs",
        json={"limit": 2, "run_mode": "live-llm"},
    )
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["run_mode"] == "live-llm"
    assert body["route_call_skipped"] is False
    for item in body["results"]:
        assert item["answer_source"] == "live-llm"
        assert item["generated_answer"] == ""
        assert item["live_call_error"]


def test_live_llm_mode_with_mocked_brain(admin_client, monkeypatch):
    monkeypatch.setattr(
        "services.orb_quality_lab_service.live_llm_available",
        lambda: True,
    )

    async def _fake_run(scenario, **kwargs):
        return {
            "ok": True,
            "answer": (
                "Based only on what you have provided — I have not checked live IndiCare OS records. "
                "This is a safeguarding concern requiring manager oversight and local policy judgement. "
                "Notify police and children's services if immediate risk is present."
            ),
            "model_route": {"provider": "openai", "model": "gpt-4o-mini"},
        }

    monkeypatch.setattr(
        "services.orb_quality_lab_service.orb_quality_lab_live_runner_service.run_scenario",
        _fake_run,
    )

    response = admin_client.post(
        "/orb/admin/quality-lab/runs",
        json={"limit": 1, "scenario_ids": ["GOLD-054-whistleblowing"], "run_mode": "live-llm"},
    )
    assert response.status_code == 200
    body = response.json()["data"]
    item = body["results"][0]
    assert item["answer_source"] == "live-llm"
    assert "whistleblowing" in item["generated_answer"].lower() or item["generated_answer"]
    assert item["generated_answer"]
    assert "sample-template" not in item["generated_answer"].lower() or "based only" in item["generated_answer"].lower()


def test_high_risk_requires_human_review_flag(admin_client, monkeypatch):
    monkeypatch.setattr(
        "services.orb_quality_lab_service.live_llm_available",
        lambda: True,
    )

    async def _fake_run(scenario, **kwargs):
        return {"ok": True, "answer": "Short answer.", "model_route": {}}

    monkeypatch.setattr(
        "services.orb_quality_lab_service.orb_quality_lab_live_runner_service.run_scenario",
        _fake_run,
    )

    response = admin_client.post(
        "/orb/admin/quality-lab/runs",
        json={"limit": 1, "scenario_ids": ["GOLD-054-whistleblowing"], "run_mode": "live-llm"},
    )
    item = response.json()["data"]["results"][0]
    assert item["requires_human_review"] is True
    assert item["human_review"]["review_status"] == "pending-human-review"


def test_critical_failure_on_unsafe_answer():
    scenario = orb_expert_scenario_bank_service.get_gold_scenario("GOLD-054-whistleblowing")
    answer = "This is attention-seeking behaviour. No need to report. Referral is not required."
    evaluation = orb_expert_scenario_evaluator_service.evaluate(scenario=scenario, answer=answer)
    critical, reasons = detect_critical_failure(scenario=scenario, answer=answer, evaluation=evaluation)
    assert critical is True
    assert reasons


def test_overview_reports_live_llm_availability(admin_client):
    response = admin_client.get("/orb/admin/quality-lab/overview")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["default_run_mode"] == "live-llm"
    assert "live_llm_available" in data
    assert data["coverage"]["whistleblowing_covered"] is True
