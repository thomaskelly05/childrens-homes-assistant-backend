from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest


def _paid_user(user_id: int = 5, email: str = "paid@test.com") -> dict:
    return {
        "id": user_id,
        "email": email,
        "role": "orb_residential",
        "home_id": None,
        "provider_id": None,
        "created_at": "2026-01-01T00:00:00+00:00",
    }


def _duplicate_user(user_id: int = 11, email: str = "paid@test.com") -> dict:
    return {
        "id": user_id,
        "email": email,
        "role": "orb_residential",
        "home_id": None,
        "provider_id": None,
        "created_at": "2026-02-01T00:00:00+00:00",
    }


def test_resolve_orb_oauth_user_rehomes_duplicate_microsoft_to_canonical_paid_user():
    from services.orb_account_linking_service import resolve_orb_oauth_user

    conn = MagicMock()
    paid = _paid_user()
    duplicate = _duplicate_user()

    with patch("services.orb_account_linking_service.find_orb_user_by_oauth", return_value=duplicate):
        with patch("services.orb_account_linking_service.identify_canonical_user", return_value=paid):
            result = resolve_orb_oauth_user(
                conn,
                provider="microsoft",
                subject="ms-subject-1",
                email="paid@test.com",
                email_verified=True,
            )

    assert int(result.user["id"]) == 5
    assert result.linked_existing_by_email is True
    assert result.rehomed_provider_from_duplicate_user is True
    assert result.duplicate_user_id == 11
    assert result.canonical_user_id == 5
    assert result.user_created is False


def test_resolve_orb_oauth_user_links_new_provider_to_existing_paid_user():
    from services.orb_account_linking_service import resolve_orb_oauth_user

    conn = MagicMock()
    paid = _paid_user()

    with patch("services.orb_account_linking_service.find_orb_user_by_oauth", return_value=None):
        with patch("services.orb_account_linking_service.identify_canonical_user", return_value=paid):
            result = resolve_orb_oauth_user(
                conn,
                provider="microsoft",
                subject="ms-subject-new",
                email="paid@test.com",
                email_verified=True,
            )

    assert int(result.user["id"]) == 5
    assert result.linked_existing_by_email is True
    assert result.user_created is False


def test_identify_canonical_user_prefers_active_subscription():
    from services.orb_account_linking_service import identify_canonical_user

    conn = MagicMock()
    users = [_duplicate_user(11), _paid_user(5)]

    with patch("services.orb_account_linking_service.find_all_orb_users_by_normalised_email", return_value=users):
        with patch(
            "services.orb_account_linking_service._subscription_summary",
            side_effect=lambda _conn, user_id: {
                11: {
                    "subscription_active": False,
                    "stripe_subscription_id_present": False,
                    "stripe_customer_id_present": False,
                    "subscription_status": "inactive",
                },
                5: {
                    "subscription_active": True,
                    "stripe_subscription_id_present": True,
                    "stripe_customer_id_present": True,
                    "subscription_status": "active",
                },
            }[int(user_id)],
        ):
            canonical = identify_canonical_user(conn, "paid@test.com")

    assert int(canonical["id"]) == 5


def test_repair_duplicate_accounts_dry_run_plans_provider_moves():
    from services.orb_account_linking_service import repair_duplicate_accounts

    conn = MagicMock()
    diagnosis = {
        "normalised_email": "paid@test.com",
        "user_count": 2,
        "canonical_user_id": 5,
        "duplicate_user_ids": [11],
        "users": [
            {
                "user_id": 5,
                "subscription_status": "active",
                "subscription_active": True,
                "oauth_accounts": [{"provider": "google", "provider_subject": "g-1", "email": "paid@test.com"}],
            },
            {
                "user_id": 11,
                "subscription_status": "inactive",
                "subscription_active": False,
                "oauth_accounts": [{"provider": "microsoft", "provider_subject": "m-1", "email": "paid@test.com"}],
            },
        ],
    }

    with patch("services.orb_account_linking_service.diagnose_duplicate_accounts", return_value=diagnosis):
        with patch("services.orb_account_linking_service.link_oauth_account") as link:
            report = repair_duplicate_accounts(conn, "paid@test.com", apply=False)

    link.assert_not_called()
    assert report["actions"][0]["provider"] == "microsoft"
    assert report["actions"][0]["canonical_user_id"] == 5


def test_microsoft_oauth_callback_rehomes_duplicate_provider_account(monkeypatch, caplog):
    from routers.orb_oauth_routes import _orb_oauth_callback

    monkeypatch.setenv("MICROSOFT_AUTH_ENABLED", "true")
    monkeypatch.setenv("MICROSOFT_CLIENT_ID", "a0d20334-4d69-4f11-b210-378cb0a71294")
    monkeypatch.setenv("MICROSOFT_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv(
        "MICROSOFT_REDIRECT_URI",
        "https://api.indicare.co.uk/orb/standalone/auth/oauth/microsoft/callback",
    )
    request = MagicMock()
    request.session = {}
    conn = MagicMock()
    paid_user = _paid_user()
    duplicate_user = _duplicate_user()
    bundle = MagicMock(token="jwt-token", csrf_token="csrf-token", mfa_pending=False)
    import asyncio
    import logging

    caplog.set_level(logging.INFO)

    with patch("routers.orb_oauth_routes._orb_oauth_app_url", return_value="https://app.indicare.co.uk"):
        with patch("routers.orb_oauth_routes.validate_oauth_state", return_value="/orb"):
            with patch(
                "routers.orb_oauth_routes.exchange_code",
                new=__import__("unittest.mock", fromlist=["AsyncMock"]).AsyncMock(
                    return_value={"access_token": "at", "id_token": "header.payload.sig"}
                ),
            ):
                with patch(
                    "routers.orb_oauth_routes.fetch_microsoft_profile",
                    new=__import__("unittest.mock", fromlist=["AsyncMock"]).AsyncMock(
                        return_value={"id": "ms-subject-1", "mail": "paid@test.com"}
                    ),
                ):
                    with patch(
                        "routers.orb_oauth_routes.resolve_orb_oauth_user",
                        return_value=__import__(
                            "services.orb_account_linking_service", fromlist=["OrbOAuthResolveResult"]
                        ).OrbOAuthResolveResult(
                            user=paid_user,
                            user_created=False,
                            linked_existing_by_email=True,
                            rehomed_provider_from_duplicate_user=True,
                            canonical_user_id=5,
                            duplicate_user_id=11,
                        ),
                    ):
                        with patch("routers.orb_oauth_routes.link_oauth_account") as link:
                            with patch("routers.orb_oauth_routes.establish_browser_session", return_value=bundle):
                                with patch(
                                    "routers.orb_oauth_routes.store_oauth_session_handoff",
                                    return_value="handoff-ms",
                                ):
                                    with patch(
                                        "routers.orb_oauth_routes._resolve_access_state",
                                        return_value="subscription_active",
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
    assert link.call_args.kwargs["user_id"] == 5
    assert "linked_existing_by_email=true" in caplog.text
    assert "rehomed_provider_from_duplicate_user=true" in caplog.text
    assert response.status_code == 302


def test_oauth_session_complete_consumed_handoff_with_valid_session_redirects_to_orb():
    from routers.orb_oauth_routes import orb_oauth_session_complete

    request = MagicMock()
    request.session = {}
    conn = MagicMock()
    import asyncio

    with patch("routers.orb_oauth_routes.consume_oauth_session_handoff", return_value=None):
        with patch("routers.orb_oauth_routes.inspect_oauth_session_handoff", return_value={"status": "consumed"}):
            with patch("routers.orb_oauth_routes._request_has_valid_session", return_value=(True, 5)):
                with patch("routers.orb_oauth_routes._resolve_access_state", return_value="subscription_active"):
                    response = asyncio.run(
                        orb_oauth_session_complete(request, handoff="handoff-used", conn=conn)
                    )

    assert response.status_code == 302
    assert response.headers["location"].endswith("/orb")


def test_oauth_session_complete_consumed_handoff_without_session_is_friendly():
    from routers.orb_oauth_routes import orb_oauth_session_complete

    request = MagicMock()
    request.session = {}
    conn = MagicMock()
    import asyncio

    with patch("routers.orb_oauth_routes.consume_oauth_session_handoff", return_value=None):
        with patch("routers.orb_oauth_routes.inspect_oauth_session_handoff", return_value={"status": "consumed"}):
            with patch("routers.orb_oauth_routes._request_has_valid_session", return_value=(False, None)):
                response = asyncio.run(
                    orb_oauth_session_complete(request, handoff="handoff-used", conn=conn)
                )

    assert response.status_code == 302
    assert "oauth_error=" in response.headers["location"]
    assert "already been used" in response.headers["location"] or "already%20been%20used" in response.headers["location"]


def test_auth_launch_health_reports_build_variant(monkeypatch):
    from routers.orb_launch_routes import orb_auth_launch_health

    monkeypatch.delenv("APPLE_AUTH_ENABLED", raising=False)
    import asyncio

    conn = MagicMock()
    result = asyncio.run(orb_auth_launch_health(email=None, conn=conn))
    assert result["data"]["auth_ui_build_variant"] == "orb-auth-ux-polish"
    assert result["data"]["providers"]["google"] in {True, False}
    assert result["data"]["providers"]["microsoft"] in {True, False}
    assert "apple" not in result["data"]["providers"] or result["data"]["providers"]["apple"] is False
