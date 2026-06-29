"""ORB Residential Phase 2m founder alpha hardening tests."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app as app_module
from auth.current_user import get_current_user, get_optional_current_user
from middleware.security_middleware import CsrfProtectionMiddleware
from services.orb_residential_source_grounded_answer_assembly_service import (
    orb_residential_source_grounded_answer_assembly_service,
)
from services.orb_residential_source_grounded_alpha_service import (
    orb_residential_source_grounded_alpha_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
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


@pytest.fixture()
def audit_capture(monkeypatch):
    calls: list[dict] = []

    def _capture(**kwargs):
        calls.append(kwargs)
        return True

    monkeypatch.setattr(
        "routers.orb_source_grounded_alpha_routes.record_audit_event",
        _capture,
    )
    return calls


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


def _unauthenticated_client(monkeypatch):
    async def _bypass_csrf_dispatch(self, request, call_next):
        return await call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)
    app_module.app.dependency_overrides.clear()
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


@pytest.fixture()
def anon_client(monkeypatch):
    yield from _unauthenticated_client(monkeypatch)


def _assert_no_chunk_text(obj: object, *, path: str = "") -> None:
    if isinstance(obj, dict):
        for key, value in obj.items():
            assert key not in {"text", "chunk_text", "content", "body", "full_text"}, (
                f"chunk text field {key!r} found at {path or '<root>'}"
            )
            if key == "chunk" and isinstance(value, dict):
                assert "text" not in value, f"nested chunk text found at {path}.chunk"
            _assert_no_chunk_text(value, path=f"{path}.{key}" if path else key)
    elif isinstance(obj, list):
        for index, item in enumerate(obj):
            _assert_no_chunk_text(item, path=f"{path}[{index}]")


def test_alpha_response_strips_nested_chunk_text(alpha_enabled, admin_client):
    response = admin_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "query": "child record", "answer_text": "Safe support."},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["chunk_text_stripped_for_api"] is True
    assert data["hardening_phase"] == "Phase 2m"

    preview = data["assembly_evaluation"]["retrieval_bundle_preview"]
    _assert_no_chunk_text(preview)
    assert preview["citation_candidates"][0].get("internal_chunk_id")
    assert preview["citation_candidates"][0].get("citation_label")
    assert preview["citation_candidates"][0].get("source_id")


def test_sanitize_assembly_evaluation_preserves_refs_only():
    assembly = orb_residential_source_grounded_answer_assembly_service.evaluate_source_grounded_assembly(
        workflow_type="daily_record",
        query="child",
        answer_text="Safe.",
    )
    sanitized = orb_residential_source_grounded_alpha_service.sanitize_assembly_evaluation_for_api(assembly)
    assert sanitized is not None
    assert sanitized["chunk_text_stripped_for_api"] is True
    _assert_no_chunk_text(sanitized.get("retrieval_bundle_preview"))


def test_public_source_grounded_enabled_blocks_founder_alpha(alpha_enabled, founder_client, monkeypatch):
    monkeypatch.setenv("ORB_SOURCE_GROUNDED_PUBLIC_ENABLED", "true")
    response = founder_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "answer_text": "Safe."},
    )
    assert response.status_code == 403
    detail = response.json()["detail"]
    assert detail["code"] == "source_grounded_alpha_blocked"
    assert "public" in detail["message"].lower()


def test_public_source_grounded_enabled_blocks_admin_alpha(alpha_enabled, admin_client, monkeypatch):
    monkeypatch.setenv("ORB_SOURCE_GROUNDED_PUBLIC_ENABLED", "true")
    response = admin_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "answer_text": "Safe."},
    )
    assert response.status_code == 403


def test_public_enabled_blocks_alpha_evaluation_service(alpha_enabled, monkeypatch):
    monkeypatch.setenv("ORB_SOURCE_GROUNDED_PUBLIC_ENABLED", "true")
    result = orb_residential_source_grounded_alpha_service.evaluate_internal_alpha(
        user={"id": 1, "role": "founder"},
        workflow_type="daily_record",
        answer_text="Safe.",
    )
    assert result["internal_alpha_access_allowed"] is False
    assert result["llm_called"] is False


def test_unauthenticated_evaluate_is_audit_logged(alpha_enabled, anon_client, audit_capture):
    response = anon_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "answer_text": "Safe."},
    )
    assert response.status_code == 401
    assert len(audit_capture) == 1
    assert audit_capture[0]["outcome"] == "denied"
    assert audit_capture[0]["action"] == "source_grounded_alpha_evaluate"
    assert audit_capture[0]["metadata"]["authenticated"] is False


def test_staff_denied_evaluate_is_audit_logged(alpha_enabled, staff_client, audit_capture):
    response = staff_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "answer_text": "Safe."},
    )
    assert response.status_code == 403
    assert len(audit_capture) == 1
    assert audit_capture[0]["outcome"] == "denied"
    assert audit_capture[0]["metadata"]["role"] == "staff"
    assert audit_capture[0]["metadata"]["access_allowed"] is False


def test_manager_denied_evaluate_is_audit_logged(alpha_enabled, manager_client, audit_capture):
    response = manager_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "answer_text": "Safe."},
    )
    assert response.status_code == 403
    assert audit_capture[0]["outcome"] == "denied"
    assert audit_capture[0]["metadata"]["role"] == "manager"


def test_founder_blocked_when_alpha_disabled_is_audit_logged(founder_client, audit_capture):
    response = founder_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "answer_text": "Safe."},
    )
    assert response.status_code == 403
    assert audit_capture[0]["outcome"] == "denied"
    assert audit_capture[0]["metadata"]["role"] == "founder"
    assert audit_capture[0]["metadata"]["alpha_enabled"] is False


def test_public_enabled_denied_evaluate_is_audit_logged(
    alpha_enabled, founder_client, monkeypatch, audit_capture
):
    monkeypatch.setenv("ORB_SOURCE_GROUNDED_PUBLIC_ENABLED", "true")
    response = founder_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "answer_text": "Safe."},
    )
    assert response.status_code == 403
    assert audit_capture[0]["outcome"] == "denied"
    assert audit_capture[0]["metadata"]["public_source_grounded_enabled"] is True


def test_successful_evaluate_is_audit_logged(alpha_enabled, admin_client, audit_capture):
    response = admin_client.post(
        "/orb/admin/source-grounded-alpha/evaluate",
        json={"workflow_type": "daily_record", "answer_text": "Safe."},
    )
    assert response.status_code == 200
    assert len(audit_capture) == 1
    assert audit_capture[0]["outcome"] == "success"
    assert audit_capture[0]["metadata"]["internal_alpha_access_allowed"] is True
    assert audit_capture[0]["metadata"]["llm_called"] is False
    assert "query" not in audit_capture[0]["metadata"]
    assert "answer_text" not in audit_capture[0]["metadata"]


def test_alpha_remains_disabled_by_default():
    assert orb_residential_source_grounded_alpha_service.alpha_enabled() is False
    assert orb_residential_source_grounded_alpha_service.public_source_grounded_enabled() is False


def test_named_signoff_artefact_remains_absent():
    assert not SIGNOFF_ARTEFACT.is_file()
