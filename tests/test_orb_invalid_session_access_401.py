from __future__ import annotations

from unittest.mock import MagicMock, patch

from fastapi import HTTPException


def test_invalid_session_token_returns_401_not_guest_payload():
    from routers.orb_billing_routes import orb_standalone_access

    conn = MagicMock()
    request = MagicMock()
    request.cookies = {"indicare_session": "invalid"}
    request.headers = {}

    import asyncio

    with patch("auth.current_user._get_request_token", return_value="invalid"), patch(
        "routers.orb_billing_routes.get_orb_residential_user",
        side_effect=HTTPException(status_code=401, detail={"code": "session_invalid_or_expired"}),
    ), patch("routers.orb_billing_routes.orb_access_service") as mock_access:
        response = asyncio.run(orb_standalone_access(request=request, conn=conn, bearer_token=None))

    mock_access.build_access_payload.assert_not_called()
    assert response.status_code == 401
    body = response.body.decode()
    assert "success" in body
    assert "unauthenticated" not in body or "session_invalid" in body
