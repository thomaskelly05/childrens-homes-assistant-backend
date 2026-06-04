from __future__ import annotations

"""ORB billing access states — backend truth, no invented UI-only states."""

from unittest.mock import MagicMock

import pytest

from services.orb_access_service import orb_access_service


def test_unauthenticated_state():
    payload = orb_access_service.build_access_payload(None, conn=MagicMock())
    assert payload["access_state"] == "unauthenticated"
    assert payload["can_use_orb"] is False


def test_trial_active_state(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _c, _u, user=None: {
            "can_use_orb": True,
            "trial_active": True,
            "trial_available": False,
            "subscription_active": False,
            "safety_accepted": True,
            "onboarding_completed": True,
            "trial": {"status": "active"},
            "subscription": {},
        },
    )
    payload = orb_access_service.build_access_payload(1, conn=conn, user={"id": 1})
    assert payload["access_state"] == "trial_active"
    assert payload["trial"]["active"] is True


def test_subscription_past_due_state(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _c, _u, user=None: {
            "can_use_orb": False,
            "trial_active": False,
            "subscription_active": True,
            "subscription_status": "past_due",
            "safety_accepted": True,
            "subscription": {"subscription_status": "past_due"},
        },
    )
    payload = orb_access_service.build_access_payload(2, conn=conn, user={"id": 2})
    assert payload["access_state"] == "subscription_past_due"


def test_authenticated_no_subscription(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _c, _u, user=None: {
            "can_use_orb": False,
            "trial_active": False,
            "trial_available": True,
            "subscription_active": False,
            "safety_accepted": True,
            "subscription": {},
        },
    )
    payload = orb_access_service.build_access_payload(3, conn=conn, user={"user_id": 3, "id": 3})
    assert payload["access_state"] == "trial_available"


def test_enterprise_provider_later_placeholder(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _c, _u, user=None: {
            "can_use_orb": False,
            "enterprise_later": True,
            "safety_accepted": True,
            "subscription": {},
        },
    )
    payload = orb_access_service.build_access_payload(4, conn=conn, user={"id": 4})
    assert payload["access_state"] == "enterprise_provider_later"


def test_admin_bypass_still_needs_safety_for_can_use_orb(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _c, _u, user=None: {
            "can_use_orb": True,
            "admin_bypass": True,
            "safety_accepted": False,
            "subscription": {},
        },
    )
    payload = orb_access_service.build_access_payload(6, conn=conn, user={"id": 6, "role": "admin"})
    assert payload["access_state"] == "admin_bypass"
    assert payload["can_use_orb"] is False
    assert payload["access_blocker"] == "safety_acceptance"


def test_subscription_cancelled_access_state(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _c, _u, user=None: {
            "can_use_orb": False,
            "subscription_active": True,
            "subscription_status": "cancelled",
            "safety_accepted": True,
            "subscription": {"subscription_status": "cancelled"},
        },
    )
    payload = orb_access_service.build_access_payload(7, conn=conn, user={"user_id": 7})
    assert payload["access_state"] == "subscription_cancelled"


def test_safety_blocks_can_use_orb_even_with_subscription(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _c, _u, user=None: {
            "can_use_orb": True,
            "trial_active": False,
            "subscription_active": True,
            "safety_accepted": False,
            "subscription": {"subscription_status": "active"},
        },
    )
    payload = orb_access_service.build_access_payload(5, conn=conn, user={"id": 5})
    assert payload["subscription"]["active"] is True
    assert payload["can_use_orb"] is False
