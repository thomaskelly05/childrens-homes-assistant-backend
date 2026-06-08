from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException


def test_disabled_provider_returns_404():
    from routers.orb_oauth_routes import orb_oauth_start

    request = MagicMock()
    request.headers = {}
    request.url.hostname = "api.indicare.co.uk"
    conn = MagicMock()
    import asyncio

    with patch("routers.orb_oauth_routes.provider_enabled", return_value=False):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(orb_oauth_start("google", request, return_url="/orb", conn=conn))
    assert exc.value.status_code == 404


def test_enabled_provider_start_redirects():
    from routers.orb_oauth_routes import orb_oauth_start

    request = MagicMock()
    request.headers = {}
    request.url.hostname = "api.indicare.co.uk"
    conn = MagicMock()
    import asyncio

    config = MagicMock()
    config.name = "google"
    config.authorize_url = "https://accounts.google.com/o/oauth2/v2/auth"
    config.redirect_uri = "https://api.indicare.co.uk/orb/standalone/auth/oauth/google/callback"
    with patch("routers.orb_oauth_routes.provider_enabled", return_value=True):
        with patch("routers.orb_oauth_routes.load_provider_config", return_value=config):
            with patch("routers.orb_oauth_routes.build_authorize_url", return_value="https://accounts.google.com/o/oauth2/v2/auth?x=1"):
                with patch("routers.orb_oauth_routes.store_oauth_session"):
                    response = asyncio.run(orb_oauth_start("google", request, return_url="/orb", conn=conn))
    assert response.status_code == 302
    assert "accounts.google.com" in response.headers["location"]


def test_oauth_start_logs_safe_diagnostics(caplog):
    from routers.orb_oauth_routes import orb_oauth_start

    request = MagicMock()
    request.headers = {"x-forwarded-host": "api.indicare.co.uk"}
    request.url.hostname = "api.indicare.co.uk"
    conn = MagicMock()
    import asyncio
    import logging

    caplog.set_level(logging.INFO)
    config = MagicMock()
    config.name = "google"
    config.authorize_url = "https://accounts.google.com/o/oauth2/v2/auth"
    config.redirect_uri = "https://api.indicare.co.uk/orb/standalone/auth/oauth/google/callback"

    with patch("routers.orb_oauth_routes.provider_enabled", return_value=True):
        with patch("routers.orb_oauth_routes.load_provider_config", return_value=config):
            with patch("routers.orb_oauth_routes.build_authorize_url", return_value="https://accounts.google.com/o/oauth2/v2/auth?x=1"):
                with patch("routers.orb_oauth_routes.store_oauth_session"):
                    asyncio.run(orb_oauth_start("google", request, return_url="/orb", conn=conn))

    log_text = caplog.text
    assert "provider=google" in log_text
    assert "oauth_start_host=api.indicare.co.uk" in log_text
    assert "state_created=true" in log_text
    assert "state_storage=server" in log_text
    assert "redirect_uri_host=api.indicare.co.uk" in log_text
    assert "start_redirect_host=accounts.google.com" in log_text


def test_invalid_state_rejected_on_callback():
    from routers.orb_oauth_routes import _orb_oauth_callback
    from services.orb_oauth_state_service import OAuthStateValidationError

    request = MagicMock()
    request.headers = {}
    request.url.hostname = "api.indicare.co.uk"
    conn = MagicMock()
    import asyncio

    with patch("routers.orb_oauth_routes.provider_enabled", return_value=True):
        with patch("routers.orb_oauth_routes.load_provider_config", return_value=MagicMock()):
            with patch(
                "routers.orb_oauth_routes.validate_oauth_state",
                side_effect=OAuthStateValidationError("missing_state"),
            ):
                response = asyncio.run(
                    _orb_oauth_callback("google", request, conn, code="abc", state="bad", error=None)
                )
    assert response.status_code == 302
    assert "oauth_error" in response.headers["location"]
    assert "Security" in response.headers["location"]


def test_callback_logs_state_validation_failure_reason(caplog):
    from routers.orb_oauth_routes import _orb_oauth_callback
    from services.orb_oauth_state_service import OAuthStateValidationError

    request = MagicMock()
    request.headers = {"x-forwarded-host": "api.indicare.co.uk"}
    request.url.hostname = "api.indicare.co.uk"
    conn = MagicMock()
    import asyncio
    import logging

    caplog.set_level(logging.INFO)

    with patch("routers.orb_oauth_routes.provider_enabled", return_value=True):
        with patch("routers.orb_oauth_routes.load_provider_config", return_value=MagicMock()):
            with patch(
                "routers.orb_oauth_routes.validate_oauth_state",
                side_effect=OAuthStateValidationError("missing_state"),
            ):
                asyncio.run(
                    _orb_oauth_callback("google", request, conn, code="abc", state="bad", error=None)
                )

    log_text = caplog.text
    assert "provider=google" in log_text
    assert "callback_host=api.indicare.co.uk" in log_text
    assert "state_present=true" in log_text
    assert "state_valid=false" in log_text
    assert "state_validation_failure_reason=missing_state" in log_text
    assert "bad" not in log_text


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


def test_orb_residential_oauth_user_does_not_require_mfa():
    from routers.auth_routes import oauth_mfa_pending_for_user

    conn = MagicMock()
    user = {"id": 9, "role": "orb_residential", "email": "orb@test.com"}
    with patch("routers.auth_routes._get_mfa_safe", return_value={"is_enabled": True}):
        assert oauth_mfa_pending_for_user(user, conn) is False


def test_google_callback_success_redirects_to_app_backend_handoff():
    from routers.orb_oauth_routes import _orb_oauth_callback

    request = MagicMock()
    request.session = {}
    conn = MagicMock()
    user = {
        "id": 42,
        "email": "oauth@test.com",
        "role": "orb_residential",
        "home_id": None,
        "provider_id": None,
    }
    bundle = MagicMock(token="jwt-token", csrf_token="csrf-token", mfa_pending=False)

    import asyncio

    with patch("routers.orb_oauth_routes._orb_oauth_app_url", return_value="https://app.indicare.co.uk"):
        with patch("routers.orb_oauth_routes.provider_enabled", return_value=True):
            with patch("routers.orb_oauth_routes.load_provider_config", return_value=MagicMock()):
                with patch("routers.orb_oauth_routes.validate_oauth_state", return_value="/orb"):
                    with patch("routers.orb_oauth_routes.exchange_code", new=AsyncMock(return_value={"access_token": "at"})):
                        with patch("routers.orb_oauth_routes.fetch_userinfo", new=AsyncMock(return_value={"sub": "sub-1", "email": "oauth@test.com", "email_verified": True})):
                            with patch("routers.orb_oauth_routes.find_orb_user_by_oauth", return_value=user):
                                with patch("routers.orb_oauth_routes.link_oauth_account"):
                                    with patch("routers.orb_oauth_routes.establish_browser_session", return_value=bundle):
                                        with patch("routers.orb_oauth_routes.store_oauth_session_handoff", return_value="handoff-abc"):
                                            with patch("routers.orb_oauth_routes._resolve_access_state", return_value="inactive"):
                                                response = asyncio.run(
                                                    _orb_oauth_callback(
                                                        "google",
                                                        request,
                                                        conn,
                                                        code="code-1",
                                                        state="state-1",
                                                        error=None,
                                                    )
                                                )
    assert response.status_code == 302
    location = response.headers["location"]
    assert location.startswith("https://app.indicare.co.uk/backend/orb/standalone/auth/oauth/session/complete")
    assert "handoff=handoff-abc" in location
    assert "set-cookie" not in {name.lower() for name in response.headers.keys()}


def test_google_callback_logs_safe_redirect_diagnostics(caplog):
    from routers.orb_oauth_routes import _orb_oauth_callback

    request = MagicMock()
    request.session = {}
    conn = MagicMock()
    user = {
        "id": 42,
        "email": "oauth@test.com",
        "role": "orb_residential",
        "home_id": None,
        "provider_id": None,
    }
    bundle = MagicMock(token="jwt-token", csrf_token="csrf-token", mfa_pending=False)

    import asyncio
    import logging

    caplog.set_level(logging.INFO)

    with patch("routers.orb_oauth_routes.provider_enabled", return_value=True):
        with patch("routers.orb_oauth_routes.load_provider_config", return_value=MagicMock()):
            with patch("routers.orb_oauth_routes.validate_oauth_state", return_value="/orb"):
                with patch("routers.orb_oauth_routes.exchange_code", new=AsyncMock(return_value={"access_token": "at"})):
                    with patch("routers.orb_oauth_routes.fetch_userinfo", new=AsyncMock(return_value={"sub": "sub-1", "email": "oauth@test.com", "email_verified": True})):
                        with patch("routers.orb_oauth_routes.find_orb_user_by_oauth", return_value=user):
                            with patch("routers.orb_oauth_routes.link_oauth_account"):
                                with patch("routers.orb_oauth_routes.establish_browser_session", return_value=bundle):
                                    with patch("routers.orb_oauth_routes.store_oauth_session_handoff", return_value="handoff-abc"):
                                        with patch("routers.orb_oauth_routes._resolve_access_state", return_value="active"):
                                            asyncio.run(
                                                _orb_oauth_callback(
                                                    "google",
                                                    request,
                                                    conn,
                                                    code="code-1",
                                                    state="state-1",
                                                    error=None,
                                                )
                                            )

    log_text = caplog.text
    assert "provider=google" in log_text
    assert "oauth_callback_success=true" in log_text
    assert "handoff_created=true" in log_text
    assert "redirect_target_is_session_complete=true" in log_text
    assert "redirect_target_host=" in log_text
    assert "mfa_required=false" in log_text
    assert "access_state=active" in log_text
    assert "response_status=302" in log_text
    assert "handoff-abc" not in log_text
    assert "code-1" not in log_text


def test_oauth_session_complete_sets_session_cookie_and_redirects_active_user_to_orb():
    from routers.orb_oauth_routes import orb_oauth_session_complete

    request = MagicMock()
    request.session = {}
    conn = MagicMock()
    payload = {
        "handoff_id": "handoff-abc",
        "user_id": 42,
        "email": "oauth@test.com",
        "session_token": "jwt-token",
        "csrf_token": "csrf-token",
        "return_url": "/orb",
        "mfa_pending": False,
        "provider": "google",
    }

    import asyncio

    with patch("routers.orb_oauth_routes.consume_oauth_session_handoff", return_value=payload):
        with patch("routers.orb_oauth_routes._resolve_access_state", return_value="active"):
            response = asyncio.run(orb_oauth_session_complete(request, handoff="handoff-abc", conn=conn))

    assert response.status_code == 302
    assert response.headers["location"].endswith("/orb")
    set_cookie = response.headers.get("set-cookie", "")
    assert "indicare_session" in set_cookie or "__Host-indicare_session" in set_cookie


def test_oauth_session_complete_inactive_user_redirects_to_billing():
    from routers.orb_oauth_routes import orb_oauth_session_complete

    request = MagicMock()
    request.session = {}
    conn = MagicMock()
    payload = {
        "handoff_id": "handoff-abc",
        "user_id": 42,
        "email": "oauth@test.com",
        "session_token": "jwt-token",
        "csrf_token": "csrf-token",
        "return_url": "/orb",
        "mfa_pending": False,
        "provider": "google",
    }

    import asyncio

    with patch("routers.orb_oauth_routes.consume_oauth_session_handoff", return_value=payload):
        with patch("routers.orb_oauth_routes._resolve_access_state", return_value="inactive"):
            response = asyncio.run(orb_oauth_session_complete(request, handoff="handoff-abc", conn=conn))

    assert response.status_code == 302
    assert response.headers["location"].endswith("/orb/billing")


def test_oauth_session_complete_logs_safe_diagnostics(caplog):
    from routers.orb_oauth_routes import orb_oauth_session_complete

    request = MagicMock()
    request.session = {}
    conn = MagicMock()
    payload = {
        "handoff_id": "handoff-abc",
        "user_id": 42,
        "email": "oauth@test.com",
        "session_token": "jwt-token",
        "csrf_token": "csrf-token",
        "return_url": "/orb",
        "mfa_pending": False,
        "provider": "google",
    }

    import asyncio
    import logging

    caplog.set_level(logging.INFO)

    with patch("routers.orb_oauth_routes.consume_oauth_session_handoff", return_value=payload):
        with patch("routers.orb_oauth_routes._resolve_access_state", return_value="active"):
            asyncio.run(orb_oauth_session_complete(request, handoff="handoff-abc", conn=conn))

    log_text = caplog.text
    assert "oauth_session_complete_hit=true" in log_text
    assert "handoff_present=true" in log_text
    assert "handoff_consumed=true" in log_text
    assert "session_created=true" in log_text
    assert "set_cookie_headers_present=true" in log_text
    assert "redirect_target_path=/orb" in log_text
    assert "mfa_required=false" in log_text
    assert "access_state=active" in log_text
    assert "jwt-token" not in log_text


def test_oauth_session_complete_mfa_required_redirects_to_mfa():
    from routers.orb_oauth_routes import orb_oauth_session_complete

    request = MagicMock()
    request.session = {}
    conn = MagicMock()
    payload = {
        "handoff_id": "handoff-abc",
        "user_id": 42,
        "email": "admin@test.com",
        "session_token": "jwt-token",
        "csrf_token": "csrf-token",
        "return_url": "/orb",
        "mfa_pending": True,
        "provider": "google",
    }

    import asyncio

    with patch("routers.orb_oauth_routes.consume_oauth_session_handoff", return_value=payload):
        with patch("routers.orb_oauth_routes._resolve_access_state", return_value="active"):
            response = asyncio.run(orb_oauth_session_complete(request, handoff="handoff-abc", conn=conn))

    assert response.status_code == 302
    assert "/mfa?next=" in response.headers["location"]


def test_orb_residential_google_callback_does_not_set_mfa_pending():
    from routers.orb_oauth_routes import _orb_oauth_callback

    request = MagicMock()
    request.session = {}
    conn = MagicMock()
    user = {
        "id": 42,
        "email": "oauth@test.com",
        "role": "orb_residential",
        "home_id": None,
        "provider_id": None,
    }
    bundle = MagicMock(token="jwt-token", csrf_token="csrf-token", mfa_pending=False)

    import asyncio

    with patch("routers.orb_oauth_routes.provider_enabled", return_value=True):
        with patch("routers.orb_oauth_routes.load_provider_config", return_value=MagicMock()):
            with patch("routers.orb_oauth_routes.validate_oauth_state", return_value="/orb"):
                with patch("routers.orb_oauth_routes.exchange_code", new=AsyncMock(return_value={"access_token": "at"})):
                    with patch("routers.orb_oauth_routes.fetch_userinfo", new=AsyncMock(return_value={"sub": "sub-1", "email": "oauth@test.com", "email_verified": True})):
                        with patch("routers.orb_oauth_routes.find_orb_user_by_oauth", return_value=user):
                            with patch("routers.orb_oauth_routes.link_oauth_account"):
                                with patch("routers.orb_oauth_routes.oauth_mfa_pending_for_user", return_value=False) as mfa_check:
                                    with patch("routers.orb_oauth_routes.establish_browser_session", return_value=bundle) as establish:
                                        with patch("routers.orb_oauth_routes.store_oauth_session_handoff", return_value="handoff-abc") as store_handoff:
                                            with patch("routers.orb_oauth_routes._resolve_access_state", return_value="active"):
                                                asyncio.run(
                                                    _orb_oauth_callback(
                                                        "google",
                                                        request,
                                                        conn,
                                                        code="code-1",
                                                        state="state-1",
                                                        error=None,
                                                    )
                                                )

    mfa_check.assert_called_once()
    establish.assert_called_once()
    assert establish.call_args.kwargs["mfa_pending"] is False
    assert store_handoff.call_args.kwargs["mfa_pending"] is False


def test_oauth_session_complete_invalid_handoff_returns_login_error():
    from routers.orb_oauth_routes import orb_oauth_session_complete

    request = MagicMock()
    request.session = {}
    conn = MagicMock()

    import asyncio

    with patch("routers.orb_oauth_routes.consume_oauth_session_handoff", return_value=None):
        response = asyncio.run(orb_oauth_session_complete(request, handoff="bad", conn=conn))

    assert response.status_code == 302
    assert "oauth_error" in response.headers["location"]


def test_inactive_oauth_user_access_state_is_inactive_not_login():
    from services.orb_front_door_verdict_service import VERDICT_INACTIVE, build_front_door_verdict

    request = MagicMock()
    request.cookies = {"indicare_session": "valid-token"}
    conn = MagicMock()
    user = {
        "user_id": 42,
        "id": 42,
        "email": "oauth@test.com",
        "role": "orb_residential",
    }
    access_payload = {
        "can_use_orb": False,
        "access_state": "inactive",
        "access_blocker": "subscription_required",
        "safety_accepted": True,
        "trial": {"active": False},
        "subscription": {"active": False},
        "billing": {},
    }

    with patch(
        "services.orb_front_door_verdict_service._get_request_token",
        return_value="valid-token",
    ):
        with patch(
            "services.orb_front_door_verdict_service.get_orb_residential_user",
            return_value=user,
        ):
            with patch(
                "services.orb_front_door_verdict_service.orb_access_service.build_access_payload",
                return_value=access_payload,
            ):
                verdict = build_front_door_verdict(request, conn, bearer_token=None)

    assert verdict["verdict"] == VERDICT_INACTIVE
    assert verdict["authenticated"] is True


def test_server_side_oauth_state_start_and_callback_on_api_host():
    from datetime import datetime, timedelta, timezone

    from services.orb_oauth_service import store_oauth_session, validate_oauth_state
    from services.orb_oauth_state_service import OAuthStateValidationError

    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor
    state_rows: dict[str, dict] = {}

    def execute(sql, params=None):
        sql_norm = " ".join(sql.split())
        if "INSERT INTO orb_oauth_states" in sql_norm and params:
            state_rows[params[0]] = {
                "state_token": params[0],
                "provider": params[1],
                "return_url": params[2],
                "start_host": params[3],
                "expires_at": params[4],
                "consumed_at": None,
            }
        elif "SELECT state_token" in sql_norm and params:
            row = state_rows.get(params[0])
            cursor.fetchone.return_value = (
                (
                    row["state_token"],
                    row["provider"],
                    row["return_url"],
                    row["start_host"],
                    row["expires_at"],
                    row["consumed_at"],
                )
                if row
                else None
            )
        elif "UPDATE orb_oauth_states" in sql_norm and params:
            row = state_rows.get(params[0])
            if row and row["consumed_at"] is None:
                row["consumed_at"] = datetime.now(timezone.utc)
                cursor.rowcount = 1
            else:
                cursor.rowcount = 0

    cursor.execute.side_effect = execute

    with patch("services.orb_oauth_state_service.ensure_state_table"):
        store_oauth_session(
            conn,
            provider="google",
            state="state-token-abc",
            return_url="/orb",
            start_host="app.indicare.co.uk",
        )
        return_url = validate_oauth_state(conn, provider="google", state="state-token-abc")

    assert return_url == "/orb"
    assert state_rows["state-token-abc"]["consumed_at"] is not None

    with patch("services.orb_oauth_state_service.ensure_state_table"):
        with pytest.raises(OAuthStateValidationError) as exc:
            validate_oauth_state(conn, provider="google", state="state-token-abc")
    assert exc.value.reason == "consumed_state"


def test_server_side_oauth_state_missing_and_expired_fail_safely():
    from datetime import datetime, timedelta, timezone

    from services.orb_oauth_state_service import OAuthStateValidationError, consume_oauth_state

    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor

    with patch("services.orb_oauth_state_service.ensure_state_table"):
        cursor.fetchone.return_value = None
        with pytest.raises(OAuthStateValidationError) as missing:
            consume_oauth_state(conn, state_token="missing", provider="google")
        assert missing.value.reason == "missing_state"

        cursor.fetchone.return_value = (
            "expired-token",
            "google",
            "/orb",
            "api.indicare.co.uk",
            datetime.now(timezone.utc) - timedelta(minutes=5),
            None,
        )
        with pytest.raises(OAuthStateValidationError) as expired:
            consume_oauth_state(conn, state_token="expired-token", provider="google")
        assert expired.value.reason == "expired_state"


def test_google_callback_redirects_to_app_backend_session_complete():
    from routers.orb_oauth_routes import _orb_oauth_callback

    request = MagicMock()
    request.headers = {"x-forwarded-host": "api.indicare.co.uk"}
    request.url.hostname = "api.indicare.co.uk"
    conn = MagicMock()
    user = {
        "id": 42,
        "email": "oauth@test.com",
        "role": "orb_residential",
        "home_id": None,
        "provider_id": None,
    }
    bundle = MagicMock(token="jwt-token", csrf_token="csrf-token", mfa_pending=False)

    import asyncio

    with patch("routers.orb_oauth_routes._orb_oauth_app_url", return_value="https://app.indicare.co.uk"):
        with patch("routers.orb_oauth_routes.provider_enabled", return_value=True):
            with patch("routers.orb_oauth_routes.load_provider_config", return_value=MagicMock()):
                with patch("routers.orb_oauth_routes.validate_oauth_state", return_value="/orb"):
                    with patch("routers.orb_oauth_routes.exchange_code", new=AsyncMock(return_value={"access_token": "at"})):
                        with patch("routers.orb_oauth_routes.fetch_userinfo", new=AsyncMock(return_value={"sub": "sub-1", "email": "oauth@test.com", "email_verified": True})):
                            with patch("routers.orb_oauth_routes.find_orb_user_by_oauth", return_value=user):
                                with patch("routers.orb_oauth_routes.link_oauth_account"):
                                    with patch("routers.orb_oauth_routes.establish_browser_session", return_value=bundle):
                                        with patch("routers.orb_oauth_routes.store_oauth_session_handoff", return_value="handoff-abc"):
                                            with patch("routers.orb_oauth_routes._resolve_access_state", return_value="active"):
                                                response = asyncio.run(
                                                    _orb_oauth_callback(
                                                        "google",
                                                        request,
                                                        conn,
                                                        code="code-1",
                                                        state="state-1",
                                                        error=None,
                                                    )
                                                )

    location = response.headers["location"]
    assert location.startswith("https://app.indicare.co.uk/backend/orb/standalone/auth/oauth/session/complete")
    assert "handoff=handoff-abc" in location
