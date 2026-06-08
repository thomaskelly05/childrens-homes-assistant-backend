from __future__ import annotations

from unittest.mock import patch

import pytest

from services.orb_production_config_service import oauth_provider_diagnostics, oauth_providers_diagnostics


def test_oauth_diagnostics_do_not_expose_secrets(monkeypatch):
    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_ID", "valid-test.apps.googleusercontent.com")
    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_SECRET", "super-secret-value")
    monkeypatch.setenv(
        "OAUTH_GOOGLE_REDIRECT_URI",
        "https://api.indicare.co.uk/orb/standalone/auth/oauth/google/callback",
    )

    payload = oauth_provider_diagnostics("google")
    serialised = str(payload)
    assert payload["enabled"] is True
    assert payload["client_id_present"] is True
    assert payload["client_id_suffix_valid"] is True
    assert payload["redirect_uri"] == (
        "https://api.indicare.co.uk/orb/standalone/auth/oauth/google/callback"
    )
    assert "super-secret-value" not in serialised
    assert "OAUTH_GOOGLE_CLIENT_SECRET" in payload["required_env_vars"]


def test_oauth_provider_enabled_only_when_fully_configured(monkeypatch):
    monkeypatch.setenv("OAUTH_MICROSOFT_CLIENT_ID", "ms-client-id")
    monkeypatch.delenv("OAUTH_MICROSOFT_CLIENT_SECRET", raising=False)
    monkeypatch.delenv("OAUTH_MICROSOFT_REDIRECT_URI", raising=False)

    payload = oauth_provider_diagnostics("microsoft")
    assert payload["enabled"] is False
    assert payload["missing_config_warnings"]


def test_oauth_providers_diagnostics_include_all_providers():
    diagnostics = oauth_providers_diagnostics()
    assert set(diagnostics.keys()) == {"google", "microsoft", "apple"}


@patch("routers.orb_launch_routes.passkey_config_warnings", return_value=[])
@patch("routers.orb_launch_routes.stripe_config_warnings", return_value=[])
@patch("routers.orb_launch_routes.oauth_config_warnings", return_value={})
@patch("routers.orb_launch_routes.oauth_providers_diagnostics")
@patch("routers.orb_launch_routes._oauth_providers")
def test_auth_providers_route_includes_diagnostics(mock_oauth, mock_diag, _oauth_warn, _stripe, _passkey):
    from routers.orb_launch_routes import list_auth_providers

    mock_oauth.return_value = {"google": False, "microsoft": False, "apple": False}
    mock_diag.return_value = {
        "google": {"enabled": False, "redirect_uri": None, "required_env_vars": ["OAUTH_GOOGLE_CLIENT_ID"]}
    }

    import asyncio

    result = asyncio.run(list_auth_providers(current_user=None))
    data = result["data"]
    assert data["login_path"] == "/orb"
    assert data["oauth_diagnostics"]["google"]["enabled"] is False
    assert "super-secret-value" not in str(data)
