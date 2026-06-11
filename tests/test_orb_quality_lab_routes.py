from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app as app_module
from auth.current_user import get_current_user
from middleware.security_middleware import CsrfProtectionMiddleware


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


def test_quality_lab_overview_requires_admin(staff_client):
    response = staff_client.get("/orb/admin/quality-lab/overview")
    assert response.status_code == 403


def test_quality_lab_overview_returns_gold_count(admin_client):
    response = admin_client.get("/orb/admin/quality-lab/overview")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["gold_scenario_count"] == 100
    assert body["data"]["family_count"] > 0


def test_quality_lab_list_scenarios(admin_client):
    response = admin_client.get("/orb/admin/quality-lab/scenarios?limit=5")
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["count"] == 5
    assert body["data"]["scenarios"][0]["scenario_id"]


def test_quality_lab_run_gold_pack(admin_client):
    response = admin_client.post(
        "/orb/admin/quality-lab/runs",
        json={"limit": 3, "use_sample_answers": True, "run_mode": "template"},
    )
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["scenario_count"] == 3
    assert len(body["results"]) == 3
    assert "run_id" in body
    assert body["run_mode"] == "template"
    assert body["route_call_skipped"] is True


def test_quality_lab_evaluate_unknown_scenario(admin_client):
    response = admin_client.post(
        "/orb/admin/quality-lab/evaluate",
        json={"scenario_id": "UNKNOWN", "answer": "Test answer"},
    )
    assert response.status_code == 404


def test_quality_lab_evaluate_answer(admin_client):
    response = admin_client.post(
        "/orb/admin/quality-lab/evaluate",
        json={
            "scenario_id": "GOLD-001-unknown-vehicle-missing",
            "answer": (
                "Based only on what you have provided — I have not checked live IndiCare OS records. "
                "Unknown adult and vehicle present an immediate safeguarding and exploitation risk."
            ),
        },
    )
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["scenario_id"] == "GOLD-001-unknown-vehicle-missing"
    assert body["evaluation"]["score"] >= 0


def test_quality_lab_frontend_route_exists():
    page = Path("frontend-next/app/founder/quality-lab/page.tsx")
    assert page.exists()
    content = page.read_text(encoding="utf-8")
    assert "FounderQualityLabPage" in content
    assert "FounderGuard" in content
