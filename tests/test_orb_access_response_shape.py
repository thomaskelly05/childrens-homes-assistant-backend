from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest


REQUIRED_ACCESS_KEYS = {
    "contract_version",
    "can_use_orb",
    "access_state",
    "standalone",
    "trial",
    "subscription",
    "safety_accepted",
}


def test_authenticated_active_access_payload_shape():
    from services.orb_access_service import orb_access_service

    conn = MagicMock()
    with patch(
        "services.orb_access_service.get_orb_access_state",
        return_value={
            "can_use_orb": True,
            "subscription_active": True,
            "subscription_status": "active",
            "safety_accepted": True,
            "trial_active": False,
            "trial_available": False,
            "subscription": {"subscription_status": "active"},
            "trial": {},
        },
    ):
        payload = orb_access_service.build_access_payload(1, conn=conn, user={"id": 1})

    assert payload["contract_version"] == "orb_access_v2"
    assert payload["can_use_orb"] is True
    assert payload["access_blocker"] is None
    for key in REQUIRED_ACCESS_KEYS:
        assert key in payload


def test_inactive_access_payload_shape():
    from services.orb_access_service import orb_access_service

    conn = MagicMock()
    with patch(
        "services.orb_access_service.get_orb_access_state",
        return_value={
            "can_use_orb": False,
            "subscription_active": False,
            "subscription_status": None,
            "safety_accepted": False,
            "trial_active": False,
            "trial_available": True,
            "subscription": {},
            "trial": {},
        },
    ):
        payload = orb_access_service.build_access_payload(2, conn=conn, user={"id": 2})

    assert payload["contract_version"] == "orb_access_v2"
    assert payload["can_use_orb"] is False
    assert payload["access_blocker"] is not None


def test_guest_payload_includes_contract_version():
    from services.orb_access_service import orb_access_service

    payload = orb_access_service.build_access_payload(None, conn=MagicMock())
    assert payload["contract_version"] == "orb_access_v2"
    assert payload["access_state"] == "unauthenticated"
    assert payload["can_use_orb"] is False
