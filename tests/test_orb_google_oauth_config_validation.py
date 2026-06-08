from __future__ import annotations

import asyncio
import urllib.parse

import pytest
from fastapi import HTTPException

from services.orb_oauth_service import (
    EXPECTED_GOOGLE_REDIRECT_URI,
    build_authorize_url,
    google_redirect_uri_matches_expected,
    is_valid_google_client_id,
    load_provider_config,
)
from services.orb_production_config_service import oauth_provider_diagnostics


def test_is_valid_google_client_id_requires_googleusercontent_suffix():
    assert is_valid_google_client_id("valid-test.apps.googleusercontent.com") is True
    assert is_valid_google_client_id("Google") is False
    assert is_valid_google_client_id("google-client-id") is False
    assert is_valid_google_client_id("") is False


def test_google_redirect_uri_matches_expected():
    assert google_redirect_uri_matches_expected(EXPECTED_GOOGLE_REDIRECT_URI) is True
    assert google_redirect_uri_matches_expected(
        "https://app.indicare.co.uk/orb/standalone/auth/oauth/google/callback"
    ) is False


def test_malformed_google_client_id_disables_provider(monkeypatch):
    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_ID", "Google")
    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv("OAUTH_GOOGLE_REDIRECT_URI", EXPECTED_GOOGLE_REDIRECT_URI)

    assert load_provider_config("google") is None


def test_google_diagnostics_expose_safe_fields_only(monkeypatch):
    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_ID", "valid-test.apps.googleusercontent.com")
    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_SECRET", "super-secret-value")
    monkeypatch.setenv("OAUTH_GOOGLE_REDIRECT_URI", EXPECTED_GOOGLE_REDIRECT_URI)

    payload = oauth_provider_diagnostics("google")
    serialised = str(payload)

    assert payload["enabled"] is True
    assert payload["client_id_present"] is True
    assert payload["client_id_suffix_valid"] is True
    assert payload["client_id_ends_with_googleusercontent"] is True
    assert payload["redirect_uri_matches_expected"] is True
    assert payload["expected_redirect_uri"] == EXPECTED_GOOGLE_REDIRECT_URI
    assert "valid-test.apps.googleusercontent.com" not in serialised
    assert "super-secret-value" not in serialised


def test_malformed_google_diagnostics_flag_invalid_suffix(monkeypatch):
    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_ID", "Google")
    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv("OAUTH_GOOGLE_REDIRECT_URI", EXPECTED_GOOGLE_REDIRECT_URI)

    payload = oauth_provider_diagnostics("google")
    assert payload["enabled"] is False
    assert payload["client_id_present"] is True
    assert payload["client_id_suffix_valid"] is False
    assert payload["client_id_ends_with_googleusercontent"] is False
    assert any("googleusercontent" in w for w in payload["missing_config_warnings"])


def test_google_start_redirects_with_valid_env(monkeypatch):
    from routers.orb_oauth_routes import orb_oauth_start

    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_ID", "valid-test.apps.googleusercontent.com")
    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv("OAUTH_GOOGLE_REDIRECT_URI", EXPECTED_GOOGLE_REDIRECT_URI)

    request = type("Req", (), {"session": {}})()
    response = asyncio.run(orb_oauth_start("google", request, return_url="/orb"))

    assert response.status_code == 302
    location = response.headers["location"]
    assert "accounts.google.com" in location
    assert "client_id=valid-test.apps.googleusercontent.com" in location
    assert urllib.parse.quote(EXPECTED_GOOGLE_REDIRECT_URI, safe="") in location
    assert "test-secret" not in location


def test_malformed_google_start_does_not_redirect_to_google(monkeypatch):
    from routers.orb_oauth_routes import orb_oauth_start

    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_ID", "Google")
    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv("OAUTH_GOOGLE_REDIRECT_URI", EXPECTED_GOOGLE_REDIRECT_URI)

    request = type("Req", (), {"session": {}})()
    with pytest.raises(HTTPException) as exc:
        asyncio.run(orb_oauth_start("google", request, return_url="/orb"))

    assert exc.value.status_code in {404, 503}
    assert "accounts.google.com" not in str(exc.value.detail)


def test_build_authorize_url_never_includes_secret():
    from services.orb_oauth_service import OrbOAuthProviderConfig

    config = OrbOAuthProviderConfig(
        name="google",
        client_id="valid-test.apps.googleusercontent.com",
        client_secret="test-secret",
        redirect_uri=EXPECTED_GOOGLE_REDIRECT_URI,
        authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
        token_url="https://oauth2.googleapis.com/token",
        scopes=("openid", "email"),
    )
    url = build_authorize_url(config, state="state-token")
    assert "test-secret" not in url
    assert "client_id=valid-test.apps.googleusercontent.com" in url
