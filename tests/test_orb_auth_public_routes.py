from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException


def test_public_analytics_allows_signup_viewed_without_auth():
    from routers.orb_billing_routes import orb_analytics_event, OrbAnalyticsEventRequest

    conn = MagicMock()
    payload = OrbAnalyticsEventRequest(event="signup_viewed", metadata={})
    import asyncio

    result = asyncio.run(orb_analytics_event(payload, conn=conn, current_user=None))
    assert result["success"] is True
    conn.commit.assert_called()


def test_public_analytics_rejects_authenticated_only_event():
    from routers.orb_billing_routes import orb_analytics_event, OrbAnalyticsEventRequest

    conn = MagicMock()
    payload = OrbAnalyticsEventRequest(event="trial_started", metadata={})
    import asyncio

    with pytest.raises(HTTPException) as exc:
        asyncio.run(orb_analytics_event(payload, conn=conn, current_user=None))
    assert exc.value.status_code == 401


def test_signup_creates_orb_residential_role_only():
    from routers.orb_billing_routes import OrbSignupRequest, orb_standalone_signup

    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor
    cursor.fetchone.side_effect = [None, {"id": 42, "email": "orb@test.com", "role": "orb_residential", "first_name": "A", "last_name": "B"}]
    payload = OrbSignupRequest(email="orb@test.com", password="SecurePass12345")
    import asyncio

    with patch("routers.orb_billing_routes.hash_password", return_value="hashed"):
        result = asyncio.run(orb_standalone_signup(payload, conn=conn))
    assert result["success"] is True
    insert_values = cursor.execute.call_args_list[1][0][1]
    assert insert_values[2] == "orb_residential"
    assert insert_values[3] is None
    assert insert_values[4] is None


def test_signup_does_not_grant_os_access_in_insert():
    from routers.orb_billing_routes import OrbSignupRequest, orb_standalone_signup

    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor
    cursor.fetchone.side_effect = [None, {"id": 1, "email": "x@test.com", "role": "orb_residential"}]
    payload = OrbSignupRequest(email="x@test.com", password="SecurePass12345")
    import asyncio

    with patch("routers.orb_billing_routes.hash_password", return_value="hashed"):
        asyncio.run(orb_standalone_signup(payload, conn=conn))
    values = cursor.execute.call_args_list[1][0][1]
    assert values[2] == "orb_residential"
    assert values[3] is None
    assert values[4] is None


def test_optional_me_style_access_without_user():
    from routers.orb_billing_routes import orb_standalone_access

    conn = MagicMock()
    import asyncio

    with patch("routers.orb_billing_routes.orb_access_service") as mock_access:
        mock_access.build_access_payload.return_value = {
            "access_state": "unauthenticated",
            "can_use_orb": False,
            "os_access_granted": False,
        }
        result = asyncio.run(orb_standalone_access(conn=conn, current_user=None))
    assert result["success"] is True
    assert result["data"]["os_access_granted"] is False


def test_admin_feedback_summary_requires_admin_dependency():
    from auth.permissions import require_admin

    with pytest.raises(Exception):
        require_admin({"id": 1, "role": "orb_residential"})


def test_csrf_exempt_includes_orb_signup():
    from middleware.security_middleware import CSRF_EXEMPT_PREFIXES

    assert "/orb/standalone/auth/signup" in CSRF_EXEMPT_PREFIXES
    assert "/orb/standalone/analytics/event" in CSRF_EXEMPT_PREFIXES
