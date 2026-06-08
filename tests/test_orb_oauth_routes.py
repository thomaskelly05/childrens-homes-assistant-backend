from __future__ import annotations

"""ORB OAuth route coverage — Microsoft enablement and Apple launch removal."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from services.orb_oauth_state_service import OAuthStateValidationError


def _configure_microsoft(monkeypatch):
    monkeypatch.setenv("MICROSOFT_AUTH_ENABLED", "true")
    monkeypatch.setenv("MICROSOFT_CLIENT_ID", "a0d20334-4d69-4f11-b210-378cb0a71294")
    monkeypatch.setenv("MICROSOFT_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv(
        "MICROSOFT_REDIRECT_URI",
        "https://api.indicare.co.uk/orb/standalone/auth/oauth/microsoft/callback",
    )
    monkeypatch.setenv("MICROSOFT_TENANT_ID", "common")


def test_microsoft_diagnostics_expose_only_safe_booleans(monkeypatch):
    from services.orb_production_config_service import oauth_provider_diagnostics

    _configure_microsoft(monkeypatch)
    payload = oauth_provider_diagnostics("microsoft")
    serialised = str(payload)
    assert payload["microsoft_enabled"] is True
    assert payload["client_id_present"] is True
    assert payload["client_secret_present"] is True
    assert payload["tenant_id_present"] is True
    assert payload["redirect_uri_present"] is True
    assert "test-secret" not in serialised
    assert "client_secret" not in serialised.lower() or "client_secret_present" in serialised


def test_microsoft_start_redirects_to_login_microsoftonline(monkeypatch):
    from routers.orb_oauth_routes import orb_oauth_start

    _configure_microsoft(monkeypatch)
    request = MagicMock()
    request.headers = {}
    request.url.hostname = "api.indicare.co.uk"
    conn = MagicMock()
    import asyncio

    with patch("routers.orb_oauth_routes.store_oauth_session") as store_state:
        response = asyncio.run(
            orb_oauth_start("microsoft", request, return_url="/orb", conn=conn)
        )
    assert response.status_code == 302
    location = response.headers["location"]
    assert "login.microsoftonline.com/common/oauth2/v2.0/authorize" in location
    store_state.assert_called_once()


def test_microsoft_start_creates_server_side_state(monkeypatch):
    from routers.orb_oauth_routes import orb_oauth_start

    _configure_microsoft(monkeypatch)
    request = MagicMock()
    request.headers = {}
    request.url.hostname = "api.indicare.co.uk"
    conn = MagicMock()
    import asyncio

    with patch("routers.orb_oauth_routes.store_oauth_session") as store_state:
        asyncio.run(orb_oauth_start("microsoft", request, return_url="/orb", conn=conn))
    kwargs = store_state.call_args.kwargs
    assert kwargs["provider"] == "microsoft"
    assert kwargs["state"]
    assert kwargs["return_url"] == "/orb"


def test_microsoft_callback_rejects_missing_state(monkeypatch):
    from routers.orb_oauth_routes import _orb_oauth_callback

    _configure_microsoft(monkeypatch)
    request = MagicMock()
    request.headers = {}
    conn = MagicMock()
    import asyncio

    response = asyncio.run(
        _orb_oauth_callback("microsoft", request, conn, code="abc", state=None, error=None)
    )
    assert response.status_code == 302
    assert "oauth_error" in response.headers["location"]


def test_microsoft_callback_rejects_invalid_state(monkeypatch):
    from routers.orb_oauth_routes import _orb_oauth_callback

    _configure_microsoft(monkeypatch)
    request = MagicMock()
    request.headers = {}
    conn = MagicMock()
    import asyncio

    with patch(
        "routers.orb_oauth_routes.validate_oauth_state",
        side_effect=OAuthStateValidationError("missing_state"),
    ):
        response = asyncio.run(
            _orb_oauth_callback("microsoft", request, conn, code="abc", state="bad", error=None)
        )
    assert response.status_code == 302
    assert "oauth_error" in response.headers["location"]


def test_microsoft_callback_handles_provider_error_safely(monkeypatch, caplog):
    from routers.orb_oauth_routes import _orb_oauth_callback

    _configure_microsoft(monkeypatch)
    request = MagicMock()
    request.headers = {}
    conn = MagicMock()
    import asyncio
    import logging

    caplog.set_level(logging.INFO)
    response = asyncio.run(
        _orb_oauth_callback(
            "microsoft",
            request,
            conn,
            code=None,
            state=None,
            error="access_denied",
            error_description="User cancelled",
        )
    )
    assert response.status_code == 302
    assert "oauth_error" in response.headers["location"]
    assert "User cancelled" not in caplog.text


def test_microsoft_callback_exchanges_code_and_links_account(monkeypatch):
    from routers.orb_oauth_routes import _orb_oauth_callback

    _configure_microsoft(monkeypatch)
    request = MagicMock()
    request.session = {}
    conn = MagicMock()
    user = {
        "id": 77,
        "email": "ms@test.com",
        "role": "orb_residential",
        "home_id": None,
        "provider_id": None,
    }
    bundle = MagicMock(token="jwt-token", csrf_token="csrf-token", mfa_pending=False)
    import asyncio

    with patch("routers.orb_oauth_routes._orb_oauth_app_url", return_value="https://app.indicare.co.uk"):
        with patch("routers.orb_oauth_routes.validate_oauth_state", return_value="/orb"):
            with patch(
                "routers.orb_oauth_routes.exchange_code",
                new=AsyncMock(return_value={"access_token": "at", "id_token": "header.payload.sig"}),
            ) as exchange:
                with patch(
                    "routers.orb_oauth_routes.fetch_microsoft_profile",
                    new=AsyncMock(
                        return_value={
                            "id": "ms-subject-1",
                            "mail": "ms@test.com",
                            "displayName": "MS User",
                        }
                    ),
                ) as fetch_profile:
                    with patch("routers.orb_oauth_routes.find_orb_user_by_oauth", return_value=user):
                        with patch("routers.orb_oauth_routes.link_oauth_account") as link:
                            with patch("routers.orb_oauth_routes.establish_browser_session", return_value=bundle):
                                with patch(
                                    "routers.orb_oauth_routes.store_oauth_session_handoff",
                                    return_value="handoff-ms",
                                ):
                                    with patch(
                                        "routers.orb_oauth_routes._resolve_access_state",
                                        return_value="active",
                                    ):
                                        response = asyncio.run(
                                            _orb_oauth_callback(
                                                "microsoft",
                                                request,
                                                conn,
                                                code="code-1",
                                                state="state-1",
                                                error=None,
                                            )
                                        )
    exchange.assert_awaited_once()
    fetch_profile.assert_awaited_once()
    assert link.call_args.kwargs["provider"] == "microsoft"
    assert link.call_args.kwargs["subject"] == "ms-subject-1"
    location = response.headers["location"]
    assert location.startswith(
        "https://app.indicare.co.uk/backend/orb/standalone/auth/oauth/session/complete"
    )
    assert "handoff=handoff-ms" in location


def test_microsoft_callback_does_not_log_or_return_tokens(monkeypatch, caplog):
    from routers.orb_oauth_routes import _orb_oauth_callback

    _configure_microsoft(monkeypatch)
    request = MagicMock()
    request.session = {}
    conn = MagicMock()
    user = {
        "id": 77,
        "email": "ms@test.com",
        "role": "orb_residential",
        "home_id": None,
        "provider_id": None,
    }
    bundle = MagicMock(token="jwt-token", csrf_token="csrf-token", mfa_pending=False)
    import asyncio
    import logging

    caplog.set_level(logging.INFO)

    with patch("routers.orb_oauth_routes._orb_oauth_app_url", return_value="https://app.indicare.co.uk"):
        with patch("routers.orb_oauth_routes.validate_oauth_state", return_value="/orb"):
            with patch(
                "routers.orb_oauth_routes.exchange_code",
                new=AsyncMock(
                    return_value={
                        "access_token": "super-access-token",
                        "refresh_token": "super-refresh-token",
                        "id_token": "super-id-token",
                    }
                ),
            ):
                with patch(
                    "routers.orb_oauth_routes.fetch_microsoft_profile",
                    new=AsyncMock(return_value={"id": "ms-subject-1", "mail": "ms@test.com"}),
                ):
                    with patch("routers.orb_oauth_routes.find_orb_user_by_oauth", return_value=user):
                        with patch("routers.orb_oauth_routes.link_oauth_account"):
                            with patch("routers.orb_oauth_routes.establish_browser_session", return_value=bundle):
                                with patch(
                                    "routers.orb_oauth_routes.store_oauth_session_handoff",
                                    return_value="handoff-ms",
                                ):
                                    with patch(
                                        "routers.orb_oauth_routes._resolve_access_state",
                                        return_value="active",
                                    ):
                                        response = asyncio.run(
                                            _orb_oauth_callback(
                                                "microsoft",
                                                request,
                                                conn,
                                                code="code-1",
                                                state="state-1",
                                                error=None,
                                            )
                                        )
    assert "super-access-token" not in caplog.text
    assert "super-refresh-token" not in caplog.text
    assert "super-id-token" not in caplog.text
    assert "super-access-token" not in response.headers["location"]


def test_microsoft_provider_configured_when_enabled(monkeypatch):
    from services.orb_oauth_service import load_provider_config
    from services.orb_subscription_plan_service import oauth_provider_configured

    _configure_microsoft(monkeypatch)
    assert oauth_provider_configured("microsoft") is True
    config = load_provider_config("microsoft")
    assert config is not None
    assert config.scopes == ("openid", "profile", "email", "User.Read")


def test_microsoft_provider_hidden_when_disabled(monkeypatch):
    from services.orb_oauth_service import load_provider_config
    from services.orb_subscription_plan_service import oauth_provider_configured

    monkeypatch.setenv("MICROSOFT_AUTH_ENABLED", "false")
    monkeypatch.setenv("MICROSOFT_CLIENT_ID", "a0d20334-4d69-4f11-b210-378cb0a71294")
    assert oauth_provider_configured("microsoft") is False
    assert load_provider_config("microsoft") is None


def test_provider_config_omits_apple_by_default(monkeypatch):
    from routers.orb_launch_routes import _oauth_providers

    monkeypatch.delenv("APPLE_AUTH_ENABLED", raising=False)
    monkeypatch.delenv("OAUTH_APPLE_CLIENT_ID", raising=False)
    providers = _oauth_providers()
    assert "apple" not in providers


def test_apple_routes_disabled_when_not_enabled(monkeypatch):
    from routers.orb_oauth_routes import orb_oauth_start

    monkeypatch.delenv("APPLE_AUTH_ENABLED", raising=False)
    monkeypatch.setenv("OAUTH_APPLE_CLIENT_ID", "com.example.app")
    request = MagicMock()
    request.headers = {}
    conn = MagicMock()
    import asyncio

    with pytest.raises(HTTPException) as exc:
        asyncio.run(orb_oauth_start("apple", request, return_url="/orb", conn=conn))
    assert exc.value.status_code == 404


def test_no_apple_env_vars_required_for_startup(monkeypatch):
    from services.orb_production_config_service import oauth_provider_config_warnings

    monkeypatch.delenv("APPLE_AUTH_ENABLED", raising=False)
    for name in (
        "OAUTH_APPLE_CLIENT_ID",
        "OAUTH_APPLE_TEAM_ID",
        "OAUTH_APPLE_KEY_ID",
        "OAUTH_APPLE_PRIVATE_KEY",
        "OAUTH_APPLE_REDIRECT_URI",
    ):
        monkeypatch.delenv(name, raising=False)
    warnings = oauth_provider_config_warnings("apple")
    assert warnings == []


def test_auth_providers_route_omits_apple_by_default(monkeypatch):
    from routers.orb_launch_routes import list_auth_providers

    monkeypatch.delenv("APPLE_AUTH_ENABLED", raising=False)
    import asyncio

    result = asyncio.run(list_auth_providers(current_user=None))
    assert "apple" not in result["data"]["oauth"]


def test_google_oauth_still_passes(monkeypatch):
    from routers.orb_oauth_routes import orb_oauth_start

    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_ID", "valid-test.apps.googleusercontent.com")
    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_SECRET", "secret")
    monkeypatch.setenv(
        "OAUTH_GOOGLE_REDIRECT_URI",
        "https://api.indicare.co.uk/orb/standalone/auth/oauth/google/callback",
    )
    request = MagicMock()
    request.headers = {}
    request.url.hostname = "api.indicare.co.uk"
    conn = MagicMock()
    import asyncio

    with patch("routers.orb_oauth_routes.store_oauth_session"):
        response = asyncio.run(orb_oauth_start("google", request, return_url="/orb", conn=conn))
    assert response.status_code == 302
    assert "accounts.google.com" in response.headers["location"]


def test_microsoft_profile_normalisation_uses_graph_fields():
    from services.orb_oauth_service import normalise_profile

    profile = normalise_profile(
        "microsoft",
        {
            "id": "graph-id-1",
            "mail": "user@contoso.com",
            "displayName": "Test User",
        },
    )
    assert profile["subject"] == "graph-id-1"
    assert profile["email"] == "user@contoso.com"
    assert profile["first_name"] == "Test"
    assert profile["last_name"] == "User"


def test_microsoft_profile_falls_back_to_user_principal_name():
    from services.orb_oauth_service import normalise_profile

    profile = normalise_profile(
        "microsoft",
        {"id": "graph-id-2", "userPrincipalName": "user@contoso.onmicrosoft.com"},
    )
    assert profile["email"] == "user@contoso.onmicrosoft.com"
