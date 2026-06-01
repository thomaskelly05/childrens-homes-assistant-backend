from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest


def test_get_orb_usage_returns_safe_summary_on_meter_failure():
    from routers.orb_usage_routes import SAFE_USAGE_SUMMARY, get_orb_usage

    conn = MagicMock()
    current_user = {"user_id": 42, "email": "u@test.com", "role": "orb_residential"}
    import asyncio

    with patch("routers.orb_usage_routes._usage_summary", side_effect=RuntimeError("meter unavailable")):
        result = asyncio.run(get_orb_usage(conn=conn, current_user=current_user))

    assert result == SAFE_USAGE_SUMMARY


def test_get_orb_usage_strips_meter_payload():
    from routers.orb_usage_routes import get_orb_usage

    conn = MagicMock()
    current_user = {"user_id": 7, "email": "u@test.com", "role": "orb_residential"}
    import asyncio

    with patch(
        "routers.orb_usage_routes._usage_summary",
        return_value={"messages_this_period": 3, "meter": {"total_requests": 3}},
    ):
        result = asyncio.run(get_orb_usage(conn=conn, current_user=current_user))

    assert result["messages_this_period"] == 3
    assert "meter" not in result


def test_get_orb_usage_requires_authentication():
    from fastapi import HTTPException

    from auth.orb_residential_dependencies import require_orb_residential_auth

    with pytest.raises(HTTPException) as exc:
        require_orb_residential_auth({"user_id": None})

    assert exc.value.status_code == 403
