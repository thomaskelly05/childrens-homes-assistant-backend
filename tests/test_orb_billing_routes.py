from __future__ import annotations

"""ORB Residential billing checkout session payload and config validation."""

import asyncio
from unittest.mock import MagicMock, patch

import pytest
import stripe
from fastapi import HTTPException

from routers.orb_billing_routes import (
    ORB_CHECKOUT_CONFIG_ERROR,
    OrbCheckoutRequest,
    orb_standalone_checkout,
)


def _valid_price() -> dict:
    return {
        "id": "price_orb_live_999",
        "active": True,
        "currency": "gbp",
        "unit_amount": 999,
        "recurring": {"interval": "month"},
    }


def _run_checkout(**patches):
    conn = MagicMock()
    defaults = {
        "STRIPE_SECRET_KEY": "sk_live_test",
        "get_orb_subscription": {},
        "stripe.Customer.create": {"id": "cus_test"},
        "stripe.Price.retrieve": _valid_price(),
        "stripe.checkout.Session.create": MagicMock(url="https://checkout.stripe.com/c/pay/cs_test"),
    }
    defaults.update(patches)

    with patch("routers.orb_billing_routes.STRIPE_SECRET_KEY", defaults["STRIPE_SECRET_KEY"]), patch(
        "routers.orb_billing_routes.get_orb_subscription", return_value=defaults["get_orb_subscription"]
    ), patch("routers.orb_billing_routes.upsert_orb_stripe_customer"), patch(
        "routers.orb_billing_routes._record_analytics"
    ), patch(
        "routers.orb_billing_routes.orb_residential_stripe_price_id", return_value="price_orb_live_999"
    ), patch(
        "routers.orb_billing_routes.stripe.Customer.create", return_value=defaults["stripe.Customer.create"]
    ), patch(
        "routers.orb_billing_routes.stripe.Price.retrieve", return_value=defaults["stripe.Price.retrieve"]
    ), patch(
        "routers.orb_billing_routes.stripe.checkout.Session.create",
        return_value=defaults["stripe.checkout.Session.create"],
    ) as create_session:
        result = asyncio.run(
            orb_standalone_checkout(
                OrbCheckoutRequest(),
                conn=conn,
                current_user={"user_id": 42, "email": "orb@test.com"},
            )
        )
    return result, create_session


def test_checkout_payload_excludes_automatic_payment_methods():
    _, create_session = _run_checkout()
    kwargs = create_session.call_args.kwargs
    assert "automatic_payment_methods" not in kwargs


def test_checkout_payload_includes_payment_method_types_card():
    _, create_session = _run_checkout()
    assert create_session.call_args.kwargs["payment_method_types"] == ["card"]


def test_checkout_payload_includes_subscription_mode():
    _, create_session = _run_checkout()
    assert create_session.call_args.kwargs["mode"] == "subscription"


def test_checkout_payload_includes_line_item_price():
    _, create_session = _run_checkout()
    line_items = create_session.call_args.kwargs["line_items"]
    assert line_items[0]["price"] == "price_orb_live_999"
    assert line_items[0]["quantity"] == 1


def test_checkout_payload_includes_success_and_cancel_urls():
    _, create_session = _run_checkout()
    kwargs = create_session.call_args.kwargs
    assert kwargs["success_url"]
    assert kwargs["cancel_url"]


def test_checkout_payload_includes_customer():
    _, create_session = _run_checkout()
    assert create_session.call_args.kwargs["customer"] == "cus_test"


def test_checkout_payload_includes_customer_when_existing_subscription(monkeypatch):
    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_live_test")
    monkeypatch.setattr(
        "routers.orb_billing_routes.orb_residential_stripe_price_id",
        lambda: "price_orb_live_999",
    )

    mock_session = MagicMock()
    mock_session.url = "https://checkout.stripe.com/c/pay/cs_test"
    conn = MagicMock()

    with patch(
        "routers.orb_billing_routes.get_orb_subscription",
        return_value={"stripe_customer_id": "cus_existing"},
    ), patch("routers.orb_billing_routes.stripe.Price.retrieve", return_value=_valid_price()), patch(
        "routers.orb_billing_routes.stripe.checkout.Session.create", return_value=mock_session
    ) as create_session, patch("routers.orb_billing_routes._record_analytics"):
        asyncio.run(
            orb_standalone_checkout(
                OrbCheckoutRequest(),
                conn=conn,
                current_user={"user_id": 7, "email": "existing@test.com"},
            )
        )

    assert create_session.call_args.kwargs["customer"] == "cus_existing"


def test_parameter_unknown_automatic_payment_methods_returns_safe_error(monkeypatch):
    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_live_test")
    monkeypatch.setattr(
        "routers.orb_billing_routes.orb_residential_stripe_price_id",
        lambda: "price_orb_live_999",
    )

    conn = MagicMock()
    stripe_error = stripe.error.InvalidRequestError(
        message="Received unknown parameter: automatic_payment_methods",
        param="automatic_payment_methods",
        code="parameter_unknown",
    )

    with patch("routers.orb_billing_routes.get_orb_subscription", return_value={}), patch(
        "routers.orb_billing_routes.stripe.Customer.create", return_value={"id": "cus_test"}
    ), patch("routers.orb_billing_routes.upsert_orb_stripe_customer"), patch(
        "routers.orb_billing_routes.stripe.Price.retrieve", return_value=_valid_price()
    ), patch(
        "routers.orb_billing_routes.stripe.checkout.Session.create", side_effect=stripe_error
    ):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(
                orb_standalone_checkout(
                    OrbCheckoutRequest(),
                    conn=conn,
                    current_user={"user_id": 1, "email": "u@test.com"},
                )
            )

    assert exc.value.status_code == 503
    assert exc.value.detail == ORB_CHECKOUT_CONFIG_ERROR
    assert "sk_live" not in str(exc.value.detail)
    assert "automatic_payment_methods" not in str(exc.value.detail)


def test_valid_mocked_stripe_response_returns_checkout_url():
    result, _ = _run_checkout()
    assert result["success"] is True
    assert result["checkout_url"] == "https://checkout.stripe.com/c/pay/cs_test"


def test_generic_stripe_checkout_error_returns_safe_message(monkeypatch):
    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_live_test")
    monkeypatch.setattr(
        "routers.orb_billing_routes.orb_residential_stripe_price_id",
        lambda: "price_orb_live_999",
    )

    conn = MagicMock()
    stripe_error = stripe.error.StripeError("Card declined")

    with patch("routers.orb_billing_routes.get_orb_subscription", return_value={}), patch(
        "routers.orb_billing_routes.stripe.Customer.create", return_value={"id": "cus_test"}
    ), patch("routers.orb_billing_routes.upsert_orb_stripe_customer"), patch(
        "routers.orb_billing_routes.stripe.Price.retrieve", return_value=_valid_price()
    ), patch(
        "routers.orb_billing_routes.stripe.checkout.Session.create", side_effect=stripe_error
    ):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(
                orb_standalone_checkout(
                    OrbCheckoutRequest(),
                    conn=conn,
                    current_user={"user_id": 1, "email": "u@test.com"},
                )
            )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Could not create checkout session"
    assert "sk_live" not in str(exc.value.detail)


def test_invalid_price_amount_returns_safe_config_error(monkeypatch):
    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_live_test")
    monkeypatch.setattr(
        "routers.orb_billing_routes.orb_residential_stripe_price_id",
        lambda: "price_orb_live_999",
    )

    conn = MagicMock()
    bad_price = _valid_price()
    bad_price["unit_amount"] = 1000

    with patch("routers.orb_billing_routes.stripe.Price.retrieve", return_value=bad_price):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(
                orb_standalone_checkout(
                    OrbCheckoutRequest(),
                    conn=conn,
                    current_user={"user_id": 1, "email": "u@test.com"},
                )
            )

    assert exc.value.status_code == 503
    assert exc.value.detail == ORB_CHECKOUT_CONFIG_ERROR
