from __future__ import annotations

"""ORB production access journey — routes, contract fields, and UI markers."""

from pathlib import Path
from unittest.mock import MagicMock

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_orb_access_journey_routes_registered():
    from routers.orb_billing_routes import router as billing
    from routers.orb_oauth_routes import router as oauth

    billing_paths = {getattr(route, "path", "") for route in billing.routes}
    oauth_paths = {getattr(route, "path", "") for route in oauth.routes}
    assert "/orb/standalone/access" in billing_paths
    assert "/orb/standalone/billing/checkout" in billing_paths
    assert "/orb/standalone/billing/webhook" in billing_paths
    assert "/orb/standalone/trial/start" in billing_paths
    assert "/orb/standalone/safety/accept" in billing_paths
    assert any("oauth" in p and "start" in p for p in oauth_paths)


def test_access_blocker_safety_after_subscription(monkeypatch):
    from services.orb_access_service import orb_access_service

    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _c, _u, user=None: {
            "can_use_orb": True,
            "trial_active": False,
            "subscription_active": True,
            "safety_accepted": False,
            "subscription": {"subscription_status": "active"},
        },
    )
    payload = orb_access_service.build_access_payload(1, conn=conn, user={"id": 1})
    assert payload["can_use_orb"] is False
    assert payload["access_blocker"] == "safety_acceptance"
    assert payload["subscription"]["active"] is True


def test_access_blocker_ready_when_safety_and_subscription(monkeypatch):
    from services.orb_access_service import orb_access_service

    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _c, _u, user=None: {
            "can_use_orb": True,
            "trial_active": False,
            "subscription_active": True,
            "safety_accepted": True,
            "subscription": {"subscription_status": "active"},
        },
    )
    payload = orb_access_service.build_access_payload(2, conn=conn, user={"id": 2})
    assert payload["can_use_orb"] is True
    assert payload["access_blocker"] is None


def test_login_page_has_signup_and_legal_links():
    text = (REPO_ROOT / "frontend-next/components/orb-residential/orb-login-screen.tsx").read_text(
        encoding="utf-8"
    )
    assert 'href="/orb/signup"' in text or 'href="/orb/signup"' in text.replace("'", '"')
    assert "OrbLegalLinks" in text
    assert "data-orb-create-account" in text


def test_billing_success_page_has_refresh_and_safety_note():
    text = (REPO_ROOT / "frontend-next/app/orb/billing/success/page.tsx").read_text(encoding="utf-8")
    assert "data-orb-billing-refresh" in text
    assert "refreshOrbAccessAfterCheckout" in text
    assert "data-orb-billing-success-safety-note" in text


def test_upgrade_screen_subscribe_marker():
    text = (REPO_ROOT / "frontend-next/components/orb-standalone/orb-upgrade-screen.tsx").read_text(
        encoding="utf-8"
    )
    assert "data-orb-subscribe" in text
    assert "subscription_past_due" in text


def test_auth_providers_includes_config_warnings(monkeypatch):
    import asyncio

    from routers.orb_launch_routes import list_auth_providers

    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    result = asyncio.run(list_auth_providers(current_user=None))
    data = result["data"]
    assert "config_warnings" in data
    assert "stripe" in data["config_warnings"]
    assert "legal" in data
    assert data["legal"]["privacy"] == "/privacy"
