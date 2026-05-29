from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app as app_module
from auth.current_user import get_current_user
from middleware.security_middleware import CsrfProtectionMiddleware
from schemas.orb_feedback import OrbFeedbackSubmitRequest
from services.orb_feedback_service import orb_feedback_service
from services.orb_improvement_candidate_service import orb_improvement_candidate_service

REPO_ROOT = Path(__file__).resolve().parents[1]
SCENARIO_BANK = REPO_ROOT / "services" / "orb_expert_scenario_bank_service.py"
PROMPTS_DIR = REPO_ROOT / "frontend-next" / "lib" / "orb" / "content"


@pytest.fixture(autouse=True)
def _reset_stores():
    orb_feedback_service.reset_memory_store()
    orb_improvement_candidate_service.reset_memory()
    yield
    orb_feedback_service.reset_memory_store()
    orb_improvement_candidate_service.reset_memory()


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


def test_admin_feedback_summary_requires_admin(staff_client):
    response = staff_client.get("/orb/admin/feedback/summary")
    assert response.status_code == 403


def test_admin_feedback_summary_allows_admin(admin_client):
    response = admin_client.get("/orb/admin/feedback/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "total_feedback" in body["data"]


def test_normal_user_cannot_view_admin_feedback_items(staff_client):
    response = staff_client.get("/orb/admin/feedback/items")
    assert response.status_code == 403


def test_candidate_approve_and_reject(admin_client):
    orb_feedback_service.submit(
        user_id=1,
        request=OrbFeedbackSubmitRequest(
            message_id="msg-1",
            rating="down",
            reason="missed_safeguarding",
            detected_family="peer_on_peer",
        ),
    )
    candidates = orb_improvement_candidate_service.list_candidates(status="pending")
    assert candidates
    candidate_id = candidates[0]["candidate_id"]

    reject = admin_client.post(
        f"/orb/admin/feedback/candidates/{candidate_id}/reject",
        json={"reviewer_note": "Not yet"},
    )
    assert reject.status_code == 200
    assert reject.json()["data"]["status"] == "rejected"

    orb_feedback_service.submit(
        user_id=1,
        request=OrbFeedbackSubmitRequest(
            message_id="msg-2",
            rating="down",
            reason="incorrect_source",
            detected_family="policy_lookup",
            source_anchors=["Reg 44"],
        ),
    )
    pending = orb_improvement_candidate_service.list_candidates(status="pending")
    assert pending
    approve = admin_client.post(
        f"/orb/admin/feedback/candidates/{pending[0]['candidate_id']}/approve",
        json={"reviewer_note": "Review source registry"},
    )
    assert approve.status_code == 200
    assert approve.json()["data"]["status"] == "approved"


def test_candidate_approval_does_not_edit_scenario_files():
    scenario_before = SCENARIO_BANK.read_text(encoding="utf-8") if SCENARIO_BANK.exists() else ""
    prompts_before = {}
    for path in PROMPTS_DIR.glob("*.ts"):
        prompts_before[str(path)] = path.read_text(encoding="utf-8")

    orb_feedback_service.submit(
        user_id=1,
        request=OrbFeedbackSubmitRequest(
            message_id="msg-x",
            rating="down",
            reason="missed_safeguarding",
            detected_family="restraint_physical_intervention",
        ),
    )
    candidates = orb_improvement_candidate_service.list_candidates(status="pending")
    assert candidates
    orb_improvement_candidate_service.approve(
        candidate_id=candidates[0]["candidate_id"],
        reviewed_by=1,
        reviewer_note="Approved for later scenario marker work",
    )

    scenario_after = SCENARIO_BANK.read_text(encoding="utf-8") if SCENARIO_BANK.exists() else ""
    assert scenario_before == scenario_after
    for path in PROMPTS_DIR.glob("*.ts"):
        assert prompts_before[str(path)] == path.read_text(encoding="utf-8")


def test_admin_billing_usage_requires_admin(staff_client):
    response = staff_client.get("/orb/admin/billing/usage")
    assert response.status_code == 403
