from __future__ import annotations

"""OAuth and passkey production readiness."""

from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_oauth_config_warnings_google(monkeypatch):
    from services.orb_production_config_service import oauth_provider_config_warnings

    monkeypatch.delenv("OAUTH_GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("OAUTH_GOOGLE_CLIENT_SECRET", raising=False)
    monkeypatch.delenv("OAUTH_GOOGLE_REDIRECT_URI", raising=False)
    warnings = oauth_provider_config_warnings("google")
    assert len(warnings) >= 3


def test_passkey_config_warnings():
    from services.orb_production_config_service import passkey_config_warnings

    warnings = passkey_config_warnings()
    assert isinstance(warnings, list)


def test_oauth_start_503_when_misconfigured(monkeypatch):
    import asyncio

    from routers.orb_oauth_routes import orb_oauth_start

    monkeypatch.setattr("routers.orb_oauth_routes.provider_enabled", lambda _p: True)
    monkeypatch.setattr("routers.orb_oauth_routes.load_provider_config", lambda _p: None)
    request = MagicMock()
    with pytest.raises(HTTPException) as exc:
        asyncio.run(orb_oauth_start("google", request=request, return_url="/orb"))
    assert exc.value.status_code == 503
    assert "not fully configured" in str(exc.value.detail).lower()


def test_passkey_routes_unchanged():
    from routers.passkey_routes import router

    paths = {getattr(route, "path", "") for route in router.routes}
    assert "/auth/passkeys/authenticate/options" in paths
    assert "/auth/passkeys/authenticate/verify" in paths


def test_login_passkey_requires_email_copy():
    auth_card = (
        REPO_ROOT / "frontend-next/components/orb-residential/orb-login-auth-card.tsx"
    ).read_text(encoding="utf-8")
    login_screen = (
        REPO_ROOT / "frontend-next/components/orb-residential/orb-login-screen.tsx"
    ).read_text(encoding="utf-8")
    assert "data-orb-passkey-email" in auth_card
    assert "Enter your email" in login_screen


def test_passkey_client_user_facing_errors():
    text = (REPO_ROOT / "frontend-next/lib/orb/orb-passkey-client.ts").read_text(encoding="utf-8")
    assert "cancelled or timed out" in text.lower()
    assert "Enter your email address" in text


def test_auth_production_doc_lists_redirect_uris():
    doc = (REPO_ROOT / "docs/orb-auth-production-readiness.md").read_text(encoding="utf-8")
    assert "OAUTH_GOOGLE_REDIRECT_URI" in doc
    assert "app.indicare.co.uk" in doc
    assert "PASSKEY_RP_ID" in doc
