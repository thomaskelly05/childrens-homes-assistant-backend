from __future__ import annotations

"""Safety acceptance gate — must remain after subscription."""

from pathlib import Path
from unittest.mock import MagicMock

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_safety_blocks_premium_even_when_raw_can_use_orb(monkeypatch):
    from services.orb_access_service import orb_access_service

    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _c, _u, user=None: {
            "can_use_orb": True,
            "subscription_active": True,
            "trial_active": False,
            "safety_accepted": False,
            "subscription": {"subscription_status": "active"},
        },
    )
    decision = orb_access_service.check_access(conn, user_id=10, workflow="ask_orb")
    assert decision.allowed is False
    assert decision.reason == "safety_acceptance_required"


def test_safety_modal_copy_explains_post_payment_step():
    text = (REPO_ROOT / "frontend-next/components/orb-residential/orb-safety-modal.tsx").read_text(
        encoding="utf-8"
    )
    assert "Before using ORB" in text
    assert "data-orb-safety-modal" in text
    assert "data-orb-safety-subscription-note" in text
    assert "not a" in text.lower() and "payment" in text.lower()
    assert "safeguarding" in text.lower()
    assert "emergency" in text.lower()
    assert "review" in text.lower()


def test_safety_accept_route_exists():
    from routers.orb_billing_routes import router

    paths = {getattr(route, "path", "") for route in router.routes}
    assert "/orb/standalone/safety/accept" in paths


def test_orb_shell_shows_safety_modal_when_not_accepted():
    text = (REPO_ROOT / "frontend-next/components/orb/orb-shell.tsx").read_text(encoding="utf-8")
    assert "OrbSafetyModal" in text
    assert "safetyAccepted" in text


def test_auth_gate_renders_safety_acceptance_screen():
    text = (REPO_ROOT / "frontend-next/components/orb-residential/orb-auth-gate.tsx").read_text(
        encoding="utf-8"
    )
    assert "OrbSafetyAcceptance" in text
    assert "Safety acceptance is required before using ORB Residential" not in text


def test_safety_acceptance_screen_has_required_copy():
    text = (REPO_ROOT / "frontend-next/components/orb-residential/orb-safety-acceptance.tsx").read_text(
        encoding="utf-8"
    )
    assert "Before using ORB Residential" in text
    assert "Accept and continue" in text
    assert "data-orb-safety-checkbox" in text
    assert "does not access live IndiCare OS care records" in text


def test_safety_accept_endpoint_records_orb_residential_acceptance():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from auth.orb_residential_dependencies import require_orb_residential_auth
    from db.connection import get_db
    from db.orb_subscription_db import ORB_SAFETY_ACCEPTANCE_VERSION
    from routers.orb_billing_routes import router

    app = FastAPI()
    app.include_router(router)

    async def fake_auth():
        return {"id": 42, "user_id": 42, "email": "orb@test", "role": "orb_residential"}

    conn = MagicMock()

    def fake_db():
        yield conn

    app.dependency_overrides[require_orb_residential_auth] = fake_auth
    app.dependency_overrides[get_db] = fake_db

    with patch("routers.orb_billing_routes.record_orb_safety_acceptance") as mock_record, patch(
        "routers.orb_billing_routes._record_analytics"
    ):
        mock_record.return_value = {
            "id": 1,
            "user_id": 42,
            "product": "orb_residential",
            "version": ORB_SAFETY_ACCEPTANCE_VERSION,
        }
        client = TestClient(app)
        response = client.post(
            "/orb/standalone/safety/accept",
            json={"version": ORB_SAFETY_ACCEPTANCE_VERSION, "accepted": True},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 200
    mock_record.assert_called_once()
    assert mock_record.call_args.kwargs["user_id"] == 42
    assert mock_record.call_args.kwargs["version"] == ORB_SAFETY_ACCEPTANCE_VERSION


def test_front_door_verdict_changes_after_safety_acceptance(monkeypatch):
    from services.orb_front_door_verdict_service import VERDICT_READY, VERDICT_SAFETY_REQUIRED, build_front_door_verdict

    request = MagicMock()
    user = {"user_id": 9, "id": 9, "email": "user@example.com"}
    pending_access = {
        "can_use_orb": False,
        "safety_accepted": False,
        "access_blocker": "safety_acceptance",
        "access_state": "trial_active",
        "trial": {"active": True},
        "subscription": {"active": False},
    }
    ready_access = {
        **pending_access,
        "can_use_orb": True,
        "safety_accepted": True,
        "access_blocker": None,
    }

    monkeypatch.setattr(
        "services.orb_front_door_verdict_service._get_request_token",
        lambda _request, _token: "token",
    )
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service.get_orb_residential_user",
        lambda _request, _token, _conn: user,
    )

    def _access(_user_id, conn=None, user=None):
        return pending_access if not getattr(_access, "accepted", False) else ready_access

    monkeypatch.setattr(
        "services.orb_front_door_verdict_service.orb_access_service.build_access_payload",
        _access,
    )

    before = build_front_door_verdict(request, conn=MagicMock(), bearer_token="token")
    assert before["verdict"] == VERDICT_SAFETY_REQUIRED

    _access.accepted = True
    after = build_front_door_verdict(request, conn=MagicMock(), bearer_token="token")
    assert after["verdict"] == VERDICT_READY


def test_unauthenticated_user_cannot_accept_safety():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from auth.orb_residential_dependencies import require_orb_residential_auth
    from db.connection import get_db
    from db.orb_subscription_db import ORB_SAFETY_ACCEPTANCE_VERSION
    from routers.orb_billing_routes import router

    app = FastAPI()
    app.include_router(router)

    async def reject_auth():
        from fastapi import HTTPException

        raise HTTPException(status_code=401, detail="Authentication required")

    conn = MagicMock()

    def fake_db():
        yield conn

    app.dependency_overrides[require_orb_residential_auth] = reject_auth
    app.dependency_overrides[get_db] = fake_db

    client = TestClient(app)
    response = client.post(
        "/orb/standalone/safety/accept",
        json={"version": ORB_SAFETY_ACCEPTANCE_VERSION, "accepted": True},
    )
    app.dependency_overrides.clear()
    assert response.status_code == 401
