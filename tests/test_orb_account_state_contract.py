from __future__ import annotations

"""Contract for ORB access payload fields consumed by account/billing UI."""

from unittest.mock import MagicMock

from services.orb_access_service import orb_access_service


REQUIRED_TOP_LEVEL_KEYS = {
    "product",
    "price_label",
    "can_use_orb",
    "access_state",
    "trial",
    "subscription",
    "billing",
    "standalone",
    "os_records_accessed",
    "os_access_granted",
    "safety_accepted",
    "upgrade",
}


def test_unauthenticated_payload_contract():
    payload = orb_access_service.build_access_payload(None, conn=MagicMock())
    assert REQUIRED_TOP_LEVEL_KEYS.issubset(payload.keys())
    assert payload["standalone"] is True
    assert payload["os_access_granted"] is False
    assert payload["os_records_accessed"] is False
    assert "brain" not in str(payload).lower()


def test_upgrade_payload_has_checkout_flags():
    upgrade = orb_access_service.build_upgrade_payload()
    assert "checkout_available" in upgrade
    assert "trial" in upgrade
    assert upgrade["trial"].get("enabled") is True
    assert "boundary_note" in upgrade
    assert upgrade["price_gbp_monthly"] == 9.99


def test_billing_block_stripe_configured_key():
    payload = orb_access_service.build_access_payload(None, conn=MagicMock())
    assert "stripe_configured" in payload["billing"]


def test_trial_nested_shape():
    payload = orb_access_service.build_access_payload(None, conn=MagicMock())
    trial = payload["trial"]
    assert "available" in trial
    assert "active" in trial


def test_subscription_nested_shape():
    payload = orb_access_service.build_access_payload(None, conn=MagicMock())
    sub = payload["subscription"]
    assert "active" in sub
    assert "status" in sub
