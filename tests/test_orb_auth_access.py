from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from auth.orb_standalone_premium_dependency import require_rich_orb_premium_access
from services.orb_access_service import orb_access_service


def test_locked_state_without_subscription(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _conn, _uid, user=None: {
            "can_use_orb": False,
            "trial_active": False,
            "trial_available": True,
            "subscription_active": False,
            "safety_accepted": True,
            "subscription": {},
        },
    )
    payload = orb_access_service.build_access_payload(3, conn=conn, user={"id": 3})
    assert payload["can_use_orb"] is False
    assert payload["access_state"] in {"locked", "trial_available", "authenticated_no_subscription"}


def test_admin_bypass_explicit(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _conn, _uid, user=None: {
            "can_use_orb": True,
            "admin_bypass": True,
            "safety_accepted": True,
            "subscription": {},
        },
    )
    payload = orb_access_service.build_access_payload(1, conn=conn, user={"id": 1, "role": "admin"})
    assert payload["access_state"] == "admin_bypass"
    assert payload["os_access_granted"] is False


def test_premium_dependency_requires_subscription(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "auth.orb_standalone_premium_dependency.orb_access_service.check_access",
        lambda _conn, user_id, workflow="ask_orb": MagicMock(
            allowed=False,
            access_state={"safety_accepted": True, "can_use_orb": False},
            reason="premium_subscription_required",
        ),
    )
    with pytest.raises(HTTPException) as exc:
        require_rich_orb_premium_access(conn=conn, current_user={"user_id": 5, "id": 5})
    assert exc.value.status_code == 402
    assert exc.value.detail["os_links"] is False
