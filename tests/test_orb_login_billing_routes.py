from __future__ import annotations

"""ORB login and billing route registration — must not break existing auth surfaces."""

from pathlib import Path

import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock, patch


REPO_ROOT = Path(__file__).resolve().parents[1]


def test_orb_login_signup_and_access_routes_registered():
    from routers.orb_billing_routes import router

    paths = {getattr(route, "path", "") for route in router.routes}
    assert "/orb/standalone/auth/signup" in paths
    assert "/orb/standalone/access" in paths
    assert "/orb/standalone/billing/checkout" in paths
    assert "/orb/standalone/billing/portal" in paths
    assert "/orb/standalone/trial/start" in paths


def test_orb_oauth_routes_exist():
    from routers.orb_oauth_routes import router

    paths = {getattr(route, "path", "") for route in router.routes}
    assert any("oauth" in p and "start" in p for p in paths)


def test_auth_login_route_unchanged():
    from routers.auth_routes import router

    paths = {getattr(route, "path", "") for route in router.routes}
    assert "/auth/login" in paths
    assert "/auth/me" in paths


def test_passkey_login_routes_exist():
    from routers.passkey_routes import router

    paths = {getattr(route, "path", "") for route in router.routes}
    assert any("passkey" in p.lower() for p in paths)


def test_csrf_exempt_includes_orb_signup_and_webhook():
    from middleware.security_middleware import CSRF_EXEMPT_PREFIXES

    assert "/orb/standalone/auth/signup" in CSRF_EXEMPT_PREFIXES


def test_frontend_orb_login_page_exists():
    login_page = REPO_ROOT / "frontend-next" / "app" / "orb" / "login" / "page.tsx"
    assert login_page.is_file()
    text = login_page.read_text(encoding="utf-8")
    assert "OrbLoginScreen" in text


def test_checkout_requires_stripe_configuration(monkeypatch):
    from routers.orb_billing_routes import orb_standalone_checkout, OrbCheckoutRequest

    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "")
    conn = MagicMock()
    payload = OrbCheckoutRequest()
    import asyncio

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            orb_standalone_checkout(
                payload,
                conn=conn,
                current_user={"user_id": 1, "email": "u@test.com"},
            )
        )
    assert exc.value.status_code == 503
