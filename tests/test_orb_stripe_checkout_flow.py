from __future__ import annotations

"""Stripe checkout / portal / webhook wiring for ORB Residential."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException


def test_checkout_creates_session_with_orb_price(monkeypatch):
    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_test")
    monkeypatch.setattr(
        "routers.orb_billing_routes.orb_residential_stripe_price_id",
        lambda: "price_orb_999",
    )

    from routers.orb_billing_routes import orb_standalone_checkout, OrbCheckoutRequest

    mock_session = MagicMock()
    mock_session.url = "https://checkout.stripe.com/test"
    mock_customer = {"id": "cus_test"}

    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor
    cursor.fetchone.return_value = None

    valid_price = {
        "id": "price_orb_999",
        "active": True,
        "currency": "gbp",
        "unit_amount": 999,
        "recurring": {"interval": "month"},
    }

    with patch("routers.orb_billing_routes.get_orb_subscription", return_value={}), patch(
        "routers.orb_billing_routes.stripe.Customer.create", return_value=mock_customer
    ), patch("routers.orb_billing_routes.upsert_orb_stripe_customer"), patch(
        "routers.orb_billing_routes.stripe.Price.retrieve", return_value=valid_price
    ), patch(
        "routers.orb_billing_routes.stripe.checkout.Session.create", return_value=mock_session
    ) as create_session:
        import asyncio

        result = asyncio.run(
            orb_standalone_checkout(
                OrbCheckoutRequest(),
                conn=conn,
                current_user={"user_id": 9, "email": "orb@test.com"},
            )
        )

    assert result["checkout_url"] == "https://checkout.stripe.com/test"
    line_items = create_session.call_args.kwargs.get("line_items") or create_session.call_args[1].get("line_items")
    assert line_items[0]["price"] == "price_orb_999"


def test_portal_requires_customer_id(monkeypatch):
    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_test")
    from routers.orb_billing_routes import orb_standalone_billing_portal

    conn = MagicMock()
    import asyncio

    with patch("routers.orb_billing_routes.get_orb_subscription", return_value={}):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(
                orb_standalone_billing_portal(
                    conn=conn,
                    current_user={"user_id": 1, "email": "a@b.com"},
                )
            )
    assert exc.value.status_code == 400


def test_webhook_route_registered():
    from routers.orb_billing_routes import router

    paths = [getattr(r, "path", "") for r in router.routes]
    assert any("webhook" in p for p in paths)


def test_subscription_grants_access_only_when_active():
    from services.orb_subscription_plan_service import subscription_grants_orb_access

    assert subscription_grants_orb_access("active") is True
    assert subscription_grants_orb_access("past_due") is False
    assert subscription_grants_orb_access("canceled") is False


def test_default_success_and_cancel_urls_use_frontend():
    from routers.orb_billing_routes import _default_success_url, _default_cancel_url

    success = _default_success_url(None)
    cancel = _default_cancel_url(None)
    assert "/orb/billing/success" in success or success.startswith("http")
    assert "/orb/billing/cancel" in cancel or cancel.startswith("http")
