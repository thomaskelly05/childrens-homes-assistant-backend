from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException


def test_access_without_token_returns_guest_json_payload():
    from routers.orb_billing_routes import orb_standalone_access

    conn = MagicMock()
    request = MagicMock()
    request.cookies = {}
    request.headers = {}

    guest_payload = {
        "contract_version": "orb_access_v2",
        "access_state": "unauthenticated",
        "can_use_orb": False,
        "os_access_granted": False,
        "standalone": True,
    }

    import asyncio

    with patch("auth.current_user._get_request_token", return_value=None), patch(
        "routers.orb_billing_routes.orb_access_service"
    ) as mock_access:
        mock_access.build_access_payload.return_value = guest_payload
        result = asyncio.run(orb_standalone_access(request=request, conn=conn, bearer_token=None))

    assert result["success"] is True
    assert result["data"]["access_state"] == "unauthenticated"
    assert result["data"]["can_use_orb"] is False
    assert result["data"]["contract_version"] == "orb_access_v2"


def test_access_with_invalid_token_returns_401_json():
    from routers.orb_billing_routes import orb_standalone_access

    conn = MagicMock()
    request = MagicMock()
    request.cookies = {"indicare_session": "stale-token"}
    request.headers = {}

    import asyncio

    with patch("auth.current_user._get_request_token", return_value="stale-token"), patch(
        "routers.orb_billing_routes.get_orb_residential_user",
        side_effect=HTTPException(
            status_code=401,
            detail={"code": "session_invalid_or_expired", "message": "Invalid or expired session"},
        ),
    ):
        response = asyncio.run(orb_standalone_access(request=request, conn=conn, bearer_token=None))

    assert response.status_code == 401
    body = response.body.decode()
    assert "session_invalid_or_expired" in body
    assert "success" in body


def test_access_with_valid_session_returns_user_payload():
    from routers.orb_billing_routes import orb_standalone_access

    conn = MagicMock()
    request = MagicMock()
    current_user = {"user_id": 7, "email": "active@indicare.co.uk", "role": "orb_residential"}
    user_payload = {
        "contract_version": "orb_access_v2",
        "access_state": "subscription_active",
        "can_use_orb": True,
        "safety_accepted": True,
        "standalone": True,
    }

    import asyncio

    with patch("auth.current_user._get_request_token", return_value="valid-token"), patch(
        "routers.orb_billing_routes.get_orb_residential_user",
        return_value=current_user,
    ), patch("routers.orb_billing_routes.orb_access_service") as mock_access:
        mock_access.build_access_payload.return_value = user_payload
        result = asyncio.run(orb_standalone_access(request=request, conn=conn, bearer_token="valid-token"))

    assert result["success"] is True
    assert result["data"]["can_use_orb"] is True
    mock_access.build_access_payload.assert_called_once_with(7, conn=conn, user=current_user)
