"""ORB Residential Phase 2l founder-only source-grounded alpha tests."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app as app_module
from auth.current_user import get_current_user, get_optional_current_user
from middleware.security_middleware import CsrfProtectionMiddleware
from scripts.verify_orb_guide_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_GUIDE_CHUNK_JSON_SHA256,
    GUIDE_CHUNKS_PATH,
    calculate_checksum as calculate_guide_checksum,
    load_payload as load_guide_payload,
)
from scripts.verify_orb_regulations_2015_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_REGULATIONS_CHUNK_JSON_SHA256,
    REGULATIONS_CHUNKS_PATH,
    calculate_checksum as calculate_regulations_checksum,
    load_payload as load_regulations_payload,
)
from scripts.verify_orb_sccif_children_homes_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_SCCIF_CHUNK_JSON_SHA256,
    SCCIF_CHUNKS_PATH,
    calculate_checksum as calculate_sccif_checksum,
    load_payload as load_sccif_payload,
)
from services.orb_residential_source_grounded_alpha_service import (
    INTERNAL_ALPHA_LABEL,
    orb_residential_source_grounded_alpha_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
ALPHA_ROUTES_PATH = REPO_ROOT / "routers" / "orb_source_grounded_alpha_routes.py"
STANDALONE_PATH = REPO_ROOT / "routers" / "orb_standalone_routes.py"
VOICE_PATH = REPO_ROOT / "services" / "orb_voice_session_service.py"
SIGNOFF_ARTEFACT = REPO_ROOT / "data" / "orb_residential_governance" / "named_source_signoffs.json"


@pytest.fixture(autouse=True)
def clear_alpha_env(monkeypatch):
    monkeypatch.delenv("ORB_SOURCE_GROUNDED_ALPHA_ENABLED", raising=False)
    monkeypatch.delenv("ORB_SOURCE_GROUNDED_PUBLIC_ENABLED", raising=False)
    monkeypatch.delenv("ORB_SOURCE_GROUNDED_ALPHA_ALLOWED_ROLES", raising=False)


@pytest.fixture()
def alpha_enabled(monkeypatch):
    monkeypatch.setenv("ORB_SOURCE_GROUNDED_ALPHA_ENABLED", "true")
    monkeypatch.setenv("ORB_SOURCE_GROUNDED_PUBLIC_ENABLED", "false")
    monkeypatch.setenv("ORB_SOURCE_GROUNDED_ALPHA_ALLOWED_ROLES", "founder,admin")


def _client_for_role(monkeypatch, role: str):
    async def _bypass_csrf_dispatch(self, request, call_next):
        return await call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)

    def user():
        return {"id": 10, "role": role, "email": f"{role}@test.com", "home_id": 1}

    app_module.app.dependency_overrides[get_current_user] = user
    app_module.app.dependency_overrides[get_optional_current_user] = user
    client = TestClient(app_module.app)
    yield client
    app_module.app.dependency_overrides.clear()


@pytest.fixture()
def admin_client(monkeypatch):
    yield from _client_for_role(monkeypatch, "admin")


@pytest.fixture()
def founder_client(monkeypatch):
    yield from _client_for_role(monkeypatch, "founder")


@pytest.fixture()
def staff_client(monkeypatch):
    yield from _client_for_role(monkeypatch, "staff")


@pytest.fixture()
def manager_client(monkeypatch):
    yield from _client_for_role(monkeypatch, "manager")


def test_default_env_keeps_alpha_disabled():
    flags = orb_residential_source_grounded_alpha_service.feature_flag_status()
    assert flags["ORB_SOURCE_GROUNDED_ALPHA_ENABLED"] is False
    assert flags["ORB_SOURCE_GROUNDED_PUBLIC_ENABLED"] is False
    assert flags["public_live_source_grounded_answers_enabled"] is False


def test_missing_env_vars_keep_alpha_disabled(monkeypatch):
    monkeypatch.delenv("ORB_SOURCE_GROUNDED_ALPHA_ENABLED", raising=False)
    assert orb_residential_source_grounded_alpha_service.alpha_enabled() is False


def test_public_source_grounded_flag_remains_false(alpha_enabled, monkeypatch):
    monkeypatch.setenv("ORB_SOURCE_GROUNDED_PUBLIC_ENABLED", "false")
    assert orb_residential_source_grounded_alpha_service.public_source_grounded_enabled() is False


def test_non_authenticated_user_blocked_by_service():
    result = orb_residential_source_grounded_alpha_service.evaluate_internal_alpha(
        user=None,
        workflow_type="daily_record",
        answer_text="Safe.",
    )
    assert result["internal_alpha_access_allowed"] is False
    assert result["llm_called"] is False


def test_staff_user_blocked(alpha_enabled, staff_client):
    response = staff_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "query": "test", "answer_text": "Safe."},
    )
    assert response.status_code == 403


def test_manager_user_blocked(alpha_enabled, manager_client):
    response = manager_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "query": "test", "answer_text": "Safe."},
    )
    assert response.status_code == 403


def test_founder_blocked_when_alpha_flag_false(founder_client):
    response = founder_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "query": "test", "answer_text": "Safe."},
    )
    assert response.status_code == 403


def test_admin_can_access_alpha_when_flag_true(alpha_enabled, admin_client):
    response = admin_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "query": "child record", "answer_text": "Safe support."},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["internal_alpha_access_allowed"] is True
    assert data["internal_alpha_mode_enabled"] is True
    assert data["public_source_grounded_answers_enabled"] is False
    assert data["llm_called"] is False
    assert data["source_chunks_sent_to_llm"] is False
    assert data["source_citations_returned_to_user"] is False


def test_founder_can_access_alpha_when_flag_true(alpha_enabled, founder_client):
    response = founder_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "answer_text": "Safe."},
    )
    assert response.status_code == 200
    assert response.json()["data"]["internal_alpha_access_allowed"] is True


def test_public_source_grounded_answers_remain_blocked(alpha_enabled, admin_client):
    response = admin_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "answer_text": "Safe."},
    )
    data = response.json()["data"]
    assert data["live_source_grounded_answers_enabled"] is False
    assert data["hard_live_enablement_block_active"] is True
    assert data["source_grounded_assembly_allowed"] is False
    assert data["assembly_evaluation"]["source_grounded_assembly_allowed"] is False


def test_founder_alpha_output_labelled_internal_only(alpha_enabled, admin_client):
    response = admin_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "answer_text": "Safe."},
    )
    data = response.json()["data"]
    assert data["internal_alpha_label"] == INTERNAL_ALPHA_LABEL
    assert INTERNAL_ALPHA_LABEL in data["internal_alpha_answer_text"]


def test_founder_alpha_output_includes_required_boundaries(alpha_enabled, admin_client):
    response = admin_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "reg_40_notification", "answer_text": "Safe notification support."},
    )
    text = response.json()["data"]["internal_alpha_answer_text"].lower()
    assert "does not provide legal advice" in text
    assert "does not decide statutory compliance" in text
    assert "regulation 40" in text
    assert "ofsted" in text
    assert "local policy" in text


def test_founder_alpha_does_not_claim_compliance(alpha_enabled, admin_client):
    response = admin_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "ofsted_evidence_preparation", "answer_text": "Safe."},
    )
    text = response.json()["data"]["internal_alpha_answer_text"].lower()
    assert "guarantees compliance" not in text
    assert "ofsted ready" not in text
    assert "inspection readiness confirmed" not in text
    claims = response.json()["data"]["claims_not_made"]
    assert claims["compliance_guarantee"] is False
    assert claims["ofsted_ready"] is False


def test_governance_visibility_shows_unsigned_sources(alpha_enabled, admin_client):
    response = admin_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "answer_text": "Safe."},
    )
    gov = response.json()["data"]["governance_visibility"]
    assert gov["named_signoff_artefact_present"] is False
    assert gov["all_sources_signed_off"] is False
    assert gov["nr_1_remains_open"] is True
    assert gov["public_promise_remains_blocked"] is True


def test_status_endpoint_shows_blocked_access_for_staff(alpha_enabled, staff_client):
    response = staff_client.get("/orb/admin/source-grounded-alpha/status")
    assert response.status_code == 200
    access = response.json()["data"]["access_status"]
    assert access["access_allowed"] is False


def test_service_blocks_non_alpha_users_without_llm():
    result = orb_residential_source_grounded_alpha_service.evaluate_internal_alpha(
        user={"id": 2, "role": "staff"},
        workflow_type="daily_record",
        answer_text="Safe.",
    )
    assert result["internal_alpha_access_allowed"] is False
    assert result["llm_called"] is False
    assert result["source_chunks_sent_to_llm"] is False
    assert result["citation_candidates_for_internal_checking"] == []


def test_no_named_signoff_artefact_created():
    assert not SIGNOFF_ARTEFACT.is_file()


def test_guide_chunks_unchanged():
    payload = load_guide_payload(GUIDE_CHUNKS_PATH)
    assert len(payload["chunks"]) == 371
    assert calculate_guide_checksum(payload) == EXPECTED_GUIDE_CHUNK_JSON_SHA256


def test_regulations_chunks_unchanged():
    payload = load_regulations_payload(REGULATIONS_CHUNKS_PATH)
    assert len(payload["chunks"]) == 100
    assert calculate_regulations_checksum(payload) == EXPECTED_REGULATIONS_CHUNK_JSON_SHA256


def test_sccif_chunks_unchanged():
    payload = load_sccif_payload(SCCIF_CHUNKS_PATH)
    assert len(payload["chunks"]) == 951
    assert calculate_sccif_checksum(payload) == EXPECTED_SCCIF_CHUNK_JSON_SHA256


def test_standalone_routes_not_wired_to_alpha():
    source = STANDALONE_PATH.read_text(encoding="utf-8")
    assert "source_grounded_alpha" not in source
    assert "source-grounded-alpha" not in source


def test_voice_service_not_wired_to_alpha():
    source = VOICE_PATH.read_text(encoding="utf-8")
    assert "source_grounded_alpha" not in source


def test_alpha_route_file_is_admin_only():
    source = ALPHA_ROUTES_PATH.read_text(encoding="utf-8")
    assert "/orb/admin/source-grounded-alpha" in source
    assert "frontend-next" not in source
    assert "orb_standalone" not in source


def test_phase_2j_hard_block_unchanged(alpha_enabled):
    from services.orb_residential_source_grounded_answer_assembly_service import (
        orb_residential_source_grounded_answer_assembly_service,
    )

    summary = orb_residential_source_grounded_answer_assembly_service.governance_summary()
    assert summary["hard_live_enablement_block_active"] is True
    assert summary["live_source_grounded_answers_enabled"] is False
