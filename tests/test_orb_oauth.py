from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException


def test_disabled_provider_returns_404():
    from routers.orb_oauth_routes import orb_oauth_start

    request = MagicMock()
    request.session = {}
    import asyncio

    with patch("routers.orb_oauth_routes.provider_enabled", return_value=False):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(orb_oauth_start("google", request, return_url="/orb"))
    assert exc.value.status_code == 404


def test_enabled_provider_start_redirects():
    from routers.orb_oauth_routes import orb_oauth_start

    request = MagicMock()
    request.session = {}
    import asyncio

    config = MagicMock()
    config.name = "google"
    with patch("routers.orb_oauth_routes.provider_enabled", return_value=True):
        with patch("routers.orb_oauth_routes.load_provider_config", return_value=config):
            with patch("routers.orb_oauth_routes.build_authorize_url", return_value="https://accounts.google.com/o/oauth2/v2/auth?x=1"):
                with patch("routers.orb_oauth_routes.store_oauth_session"):
                    response = asyncio.run(orb_oauth_start("google", request, return_url="/orb"))
    assert response.status_code == 302
    assert "accounts.google.com" in response.headers["location"]


def test_invalid_state_rejected_on_callback():
    from routers.orb_oauth_routes import _orb_oauth_callback

    request = MagicMock()
    request.session = {}
    conn = MagicMock()
    import asyncio

    with patch("routers.orb_oauth_routes.provider_enabled", return_value=True):
        with patch("routers.orb_oauth_routes.load_provider_config", return_value=MagicMock()):
            with patch("routers.orb_oauth_routes.validate_oauth_state", side_effect=ValueError("invalid_oauth_state")):
                response = asyncio.run(
                    _orb_oauth_callback("google", request, conn, code="abc", state="bad", error=None)
                )
    assert response.status_code == 302
    assert "oauth_error" in response.headers["location"]


def test_oauth_user_creation_is_orb_residential_only():
    from services.orb_oauth_service import create_orb_residential_user

    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor
    cursor.fetchone.return_value = {
        "id": 5,
        "email": "oauth@test.com",
        "role": "orb_residential",
        "home_id": None,
        "provider_id": None,
    }
    with patch("services.orb_oauth_service.hash_password", return_value="hashed"):
        user = create_orb_residential_user(conn, email="oauth@test.com")
    assert user["role"] == "orb_residential"
    assert user["home_id"] is None


def test_os_scoped_user_blocks_oauth_link():
    from services.orb_oauth_service import is_os_scoped_user

    assert is_os_scoped_user({"role": "manager", "home_id": 1}) is True
    assert is_os_scoped_user({"role": "orb_residential", "home_id": None}) is False


def test_return_url_allowlist_blocks_open_redirect():
    from services.orb_oauth_service import _normalise_return_url

    assert _normalise_return_url("/orb/onboarding") == "/orb/onboarding"
    assert _normalise_return_url("https://evil.example/phish") == "/orb"
    assert _normalise_return_url("//evil") == "/orb"
