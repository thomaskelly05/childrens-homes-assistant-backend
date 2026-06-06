"""Invalid ORB session must return 401 JSON from access endpoint — not guest 200."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException


def test_invalid_session_token_returns_401_not_guest_payload():
    from routers.orb_billing_routes import orb_standalone_access

    conn = MagicMock()
    request = MagicMock()
    request.cookies = {"indicare_session": "expired-token"}
    request.headers = {}

    import asyncio

    with patch("auth.current_user._get_request_token", return_value="expired-token"), patch(
        "routers.orb_billing_routes.get_orb_residential_user",
        side_effect=HTTPException(
            status_code=401,
            detail={"code": "session_invalid_or_expired", "message": "Invalid or expired session"},
        ),
    ):
        response = asyncio.run(orb_standalone_access(request=request, conn=conn, bearer_token=None))

    assert response.status_code == 401
    body = response.body.decode()
    assert '"success": false' in body or '"success":false' in body
    assert "session_invalid_or_expired" in body
    assert "can_use_orb" not in body
