from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from starlette.responses import PlainTextResponse

from auth.orb_residential_dependencies import is_orb_residential_only_user
from middleware import orb_residential_guard_middleware as guard_middleware
from services.orb_access_service import orb_access_service
from services.orb_runtime_guard_service import orb_runtime_guard_service
from services.orb_shift_builder_service import orb_shift_builder_service
from services.recording_intelligence_service import recording_intelligence_service
from services.safeguarding_intelligence_service import safeguarding_intelligence_service
from services.therapeutic_intelligence_service import therapeutic_intelligence_service
from schemas.orb_shift_builder import OrbShiftBuilderRequest


def test_runtime_guard_blocks_os_paths():
    decision = orb_runtime_guard_service.check_route_access(
        route="/os/command/children/1",
        surface="orb_residential",
    )
    assert decision.allowed is False
    assert decision.blocked_by_policy is True


def test_runtime_guard_allows_residential_paths():
    decision = orb_runtime_guard_service.check_route_access(
        route="/orb/residential/shift-builder",
        surface="orb_residential",
    )
    assert decision.allowed is True


def test_boundary_response_has_no_os_links():
    payload = orb_runtime_guard_service.build_boundary_response()
    assert payload["surface"] == "orb_residential"
    assert "IndiCare OS" in payload["message"]
    assert "operational_access_blocked" in payload["error"]


def test_access_service_locked_without_subscription(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _conn, _uid, user=None: {
            "can_use_orb": False,
            "subscription_active": False,
            "trial_active": False,
            "access_reason": "locked",
            "safety_accepted": True,
            "subscription": {},
        },
    )
    decision = orb_access_service.check_access(conn, user_id=42, workflow="ask_orb")
    assert decision.allowed is False
    assert decision.reason == "premium_subscription_required"


def test_access_service_trial_allowed(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _conn, _uid, user=None: {
            "can_use_orb": True,
            "subscription_active": False,
            "trial_active": True,
            "access_reason": "trial",
            "safety_accepted": True,
            "subscription": {},
        },
    )
    decision = orb_access_service.check_access(conn, user_id=42, workflow="shift_builder")
    assert decision.allowed is True


def test_upgrade_payload_price_and_product():
    payload = orb_access_service.build_upgrade_payload()
    assert payload["product"] == "ORB Residential — Powered by IndiCare"
    assert payload["price_gbp_monthly"] == 9.99


def test_shift_builder_standalone_sections():
    response = orb_shift_builder_service.build(
        OrbShiftBuilderRequest(
            notes="Evening shift calm. YP asked to call family. No injuries noted.",
            mode="full_shift_pack",
        )
    )
    assert response.live_record_access is False
    assert response.os_linked is False
    assert response.surface == "orb_residential"
    assert len(response.sections) >= 4
    assert response.context_packet


def test_safeguarding_intelligence_no_threshold_language():
    result = safeguarding_intelligence_service.analyse("Bruise noted on arm. Staff informed manager.")
    assert result.facts
    assert any("bruise" in c.lower() for c in result.concerns)
    assert "threshold" not in " ".join(result.guardrails).lower() or "does not decide" in " ".join(result.guardrails).lower()


def test_therapeutic_intelligence_no_diagnosis():
    result = therapeutic_intelligence_service.reflect("YP was aggressive then withdrawn.")
    assert result.reframe_prompts
    assert any("does not diagnose" in p.lower() for p in result.guardrails)


def test_recording_intelligence_chronology_prompts():
    result = recording_intelligence_service.analyse("Child was upset after contact.")
    assert result.chronology_ready_prompts
    assert result.factual_rewrite_prompts


def test_residential_only_user_without_records_read():
    user = {"role": "viewer", "permissions": []}
    from core.policy_engine import policy_engine

    if policy_engine.has_permission(user, "records:read"):
        pytest.skip("viewer has records:read in this policy config")
    assert is_orb_residential_only_user(user) is True


def test_orb_guard_unknown_role_session_passes_to_os_auth(monkeypatch):
    from starlette.requests import Request
    from routers.auth_routes import settings as auth_settings

    monkeypatch.setattr(guard_middleware, "decode_session_token", lambda _token: {"sub": "5"})
    cookie_name = auth_settings.session_cookie_name
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/workspace",
        "headers": [(b"cookie", f"{cookie_name}=token".encode())],
        "query_string": b"",
    }
    request = Request(scope)
    user = guard_middleware._session_user(request)
    assert user["user_id"] == 5
    assert user["role"] == ""
    assert user["permissions"] == []

    has_session_scope_claims = bool(user.get("role") or user.get("permissions"))
    assert has_session_scope_claims is False


def test_orb_guard_admin_role_is_never_residential_only(monkeypatch):
    from starlette.requests import Request
    from routers.auth_routes import settings as auth_settings

    monkeypatch.setattr(guard_middleware, "decode_session_token", lambda _token: {"sub": "5", "role": "admin"})
    cookie_name = auth_settings.session_cookie_name
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/workspace",
        "headers": [(b"cookie", f"{cookie_name}=token".encode())],
        "query_string": b"",
    }
    request = Request(scope)
    user = guard_middleware._session_user(request)
    assert user["role"] == "admin"
    assert user["role"] in guard_middleware.OS_ADMIN_ROLES


def test_premium_locked_http_shape(monkeypatch):
    from auth.orb_residential_dependencies import require_orb_residential_premium
    from starlette.requests import Request

    scope = {"type": "http", "method": "GET", "path": "/orb/residential/conversation", "headers": []}
    request = Request(scope)
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _c, _u, user=None: {
            "can_use_orb": False,
            "trial_active": False,
            "subscription_active": False,
            "safety_accepted": True,
            "subscription": {},
        },
    )
    with pytest.raises(HTTPException) as exc:
        require_orb_residential_premium(
            request,
            conn=conn,
            current_user={"user_id": 1},
            workflow="ask_orb",
        )
    assert exc.value.status_code == 402
    detail = exc.value.detail
    assert detail["price_gbp_monthly"] == 9.99
    assert detail["os_links"] is False
