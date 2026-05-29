from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from services.orb_access_service import orb_access_service
from services.orb_subscription_plan_service import (
    map_stripe_price_to_plan,
    orb_residential_stripe_price_id,
    orb_subscription_plan_service,
    subscription_grants_orb_access,
)


def test_unauthenticated_access_payload():
    conn = MagicMock()
    payload = orb_access_service.build_access_payload(None, conn=conn)
    assert payload["access_state"] == "unauthenticated"
    assert payload["can_use_orb"] is False
    assert payload["os_access_granted"] is False


def test_trial_active_grants_orb_only(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _conn, _uid, user=None: {
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
    payload = orb_access_service.build_access_payload(7, conn=conn, user={"id": 7, "role": "orb_residential"})
    assert payload["can_use_orb"] is True
    assert payload["access_state"] == "trial_active"
    assert payload["os_access_granted"] is False


def test_subscription_active_grants_orb_only(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _conn, _uid, user=None: {
            "can_use_orb": True,
            "trial_active": False,
            "subscription_active": True,
            "subscription_status": "active",
            "safety_accepted": True,
            "subscription": {"subscription_status": "active", "orb_plan": "orb_residential_individual"},
        },
    )
    payload = orb_access_service.build_access_payload(8, conn=conn, user={"id": 8})
    assert payload["can_use_orb"] is True
    assert payload["access_state"] == "subscription_active"
    assert payload["os_access_granted"] is False


def test_stripe_price_maps_to_orb_residential_individual(monkeypatch):
    monkeypatch.setenv("ORB_RESIDENTIAL_STRIPE_PRICE_ID", "price_orb_test")
    assert map_stripe_price_to_plan("price_orb_test") == "orb_residential_individual"


def test_past_due_subscription_not_active():
    assert subscription_grants_orb_access("past_due") is False


def test_checkout_uses_orb_residential_price_id(monkeypatch):
    monkeypatch.setenv("ORB_RESIDENTIAL_STRIPE_PRICE_ID", "price_orb_999")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test")
    assert orb_residential_stripe_price_id() == "price_orb_999"


def test_plan_service_never_grants_os_access():
    plan = orb_subscription_plan_service.current_plan_payload(user={"id": 1, "role": "orb_residential"})
    assert plan["os_access_granted"] is False


@patch("auth.orb_standalone_premium_dependency.orb_access_service")
def test_premium_dependency_blocks_without_safety(mock_access):
    from auth.orb_standalone_premium_dependency import require_rich_orb_premium_access

    mock_access.check_access.return_value = MagicMock(
        allowed=False,
        access_state={"safety_accepted": False, "can_use_orb": False},
        reason="safety_acceptance_required",
    )
    with pytest.raises(HTTPException) as exc:
        require_rich_orb_premium_access(conn=MagicMock(), current_user={"user_id": 1, "id": 1})
    assert exc.value.status_code == 403
