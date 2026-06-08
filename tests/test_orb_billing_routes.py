from __future__ import annotations

"""ORB Residential billing checkout session payload and config validation."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import stripe
from fastapi import HTTPException

from routers.orb_billing_routes import (
    ORB_CHECKOUT_CONFIG_ERROR,
    OrbCheckoutRequest,
    _validate_orb_stripe_checkout_config,
    orb_standalone_checkout,
)


class _StripeObjectLike:
    """Minimal StripeObject stand-in: attribute access only (no .get())."""

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


def _valid_price_dict() -> dict:
    return {
        "id": "price_orb_live_999",
        "active": True,
        "currency": "gbp",
        "unit_amount": 999,
        "recurring": {"interval": "month"},
    }


def _valid_price_stripe_object() -> _StripeObjectLike:
    return _StripeObjectLike(
        id="price_orb_live_999",
        active=True,
        currency="gbp",
        unit_amount=999,
        recurring=_StripeObjectLike(interval="month"),
    )


def _valid_price():
    return _valid_price_dict()


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
    bad_price = _valid_price_stripe_object()
    bad_price.unit_amount = 1000

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


def test_validate_stripe_checkout_config_accepts_stripe_object_price(monkeypatch):
    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_live_test")
    monkeypatch.setattr(
        "routers.orb_billing_routes.orb_residential_stripe_price_id",
        lambda: "price_orb_live_999",
    )
    with patch(
        "routers.orb_billing_routes.stripe.Price.retrieve",
        return_value=_valid_price_stripe_object(),
    ):
        assert _validate_orb_stripe_checkout_config() == "price_orb_live_999"


def test_validate_stripe_checkout_config_rejects_inactive_price(monkeypatch):
    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_live_test")
    monkeypatch.setattr(
        "routers.orb_billing_routes.orb_residential_stripe_price_id",
        lambda: "price_orb_live_999",
    )
    inactive = _valid_price_stripe_object()
    inactive.active = False
    with patch("routers.orb_billing_routes.stripe.Price.retrieve", return_value=inactive):
        with pytest.raises(HTTPException) as exc:
            _validate_orb_stripe_checkout_config()
    assert exc.value.status_code == 503
    assert exc.value.detail == ORB_CHECKOUT_CONFIG_ERROR


def test_validate_stripe_checkout_config_rejects_non_gbp_price(monkeypatch):
    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_live_test")
    monkeypatch.setattr(
        "routers.orb_billing_routes.orb_residential_stripe_price_id",
        lambda: "price_orb_live_999",
    )
    usd_price = _valid_price_stripe_object()
    usd_price.currency = "usd"
    with patch("routers.orb_billing_routes.stripe.Price.retrieve", return_value=usd_price):
        with pytest.raises(HTTPException) as exc:
            _validate_orb_stripe_checkout_config()
    assert exc.value.status_code == 503
    assert exc.value.detail == ORB_CHECKOUT_CONFIG_ERROR


def test_validate_stripe_checkout_config_rejects_wrong_amount(monkeypatch):
    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_live_test")
    monkeypatch.setattr(
        "routers.orb_billing_routes.orb_residential_stripe_price_id",
        lambda: "price_orb_live_999",
    )
    wrong_amount = _valid_price_stripe_object()
    wrong_amount.unit_amount = 1000
    with patch("routers.orb_billing_routes.stripe.Price.retrieve", return_value=wrong_amount):
        with pytest.raises(HTTPException) as exc:
            _validate_orb_stripe_checkout_config()
    assert exc.value.status_code == 503
    assert exc.value.detail == ORB_CHECKOUT_CONFIG_ERROR


def test_validate_stripe_checkout_config_rejects_missing_recurring_interval(monkeypatch):
    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_live_test")
    monkeypatch.setattr(
        "routers.orb_billing_routes.orb_residential_stripe_price_id",
        lambda: "price_orb_live_999",
    )
    no_interval = _valid_price_stripe_object()
    no_interval.recurring = _StripeObjectLike(interval=None)
    with patch("routers.orb_billing_routes.stripe.Price.retrieve", return_value=no_interval):
        with pytest.raises(HTTPException) as exc:
            _validate_orb_stripe_checkout_config()
    assert exc.value.status_code == 503
    assert exc.value.detail == ORB_CHECKOUT_CONFIG_ERROR


def test_validate_stripe_checkout_config_rejects_missing_recurring(monkeypatch):
    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_live_test")
    monkeypatch.setattr(
        "routers.orb_billing_routes.orb_residential_stripe_price_id",
        lambda: "price_orb_live_999",
    )
    no_recurring = _valid_price_stripe_object()
    no_recurring.recurring = None
    with patch("routers.orb_billing_routes.stripe.Price.retrieve", return_value=no_recurring):
        with pytest.raises(HTTPException) as exc:
            _validate_orb_stripe_checkout_config()
    assert exc.value.status_code == 503
    assert exc.value.detail == ORB_CHECKOUT_CONFIG_ERROR


def test_stripe_price_retrieve_failure_returns_safe_config_error(monkeypatch):
    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_live_test")
    monkeypatch.setattr(
        "routers.orb_billing_routes.orb_residential_stripe_price_id",
        lambda: "price_orb_live_999",
    )
    with patch(
        "routers.orb_billing_routes.stripe.Price.retrieve",
        side_effect=stripe.error.StripeError("Invalid API Key provided: sk_live_secret"),
    ):
        with pytest.raises(HTTPException) as exc:
            _validate_orb_stripe_checkout_config()
    assert exc.value.status_code == 503
    assert exc.value.detail == ORB_CHECKOUT_CONFIG_ERROR
    assert "sk_live" not in str(exc.value.detail)
    assert "Invalid API Key" not in str(exc.value.detail)


# ---------------------------------------------------------------------------
# Stripe webhook CSRF exemption and signature verification
# ---------------------------------------------------------------------------


def _webhook_request(*, signature: str | None = "sig") -> MagicMock:
    request = MagicMock()
    request.body = AsyncMock(return_value=b"{}")
    request.headers = {} if signature is None else {"stripe-signature": signature}
    return request


async def _dispatch_csrf_post(path: str, *, session: dict | None = None):
    from starlette.requests import Request
    from starlette.responses import JSONResponse

    from middleware.security_middleware import CsrfProtectionMiddleware

    reached = {"value": False}

    async def call_next(_request):
        reached["value"] = True
        return JSONResponse({"ok": True})

    scope = {
        "type": "http",
        "method": "POST",
        "path": path,
        "headers": [],
        "query_string": b"",
        "server": ("testserver", 80),
        "client": ("testclient", 50000),
        "scheme": "http",
        "root_path": "",
        "http_version": "1.1",
        "session": session if session is not None else {},
    }

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    request = Request(scope, receive)
    middleware = CsrfProtectionMiddleware(app=MagicMock())
    response = await middleware.dispatch(request, call_next)
    return response, reached["value"]


def test_csrf_exempt_exact_path_includes_subscription_webhook():
    from middleware.security_middleware import CSRF_EXEMPT_EXACT_PATHS

    assert "/orb/subscription/webhook" in CSRF_EXEMPT_EXACT_PATHS
    assert "/orb/subscription/checkout" not in CSRF_EXEMPT_EXACT_PATHS


def test_subscription_webhook_route_registered():
    from routers.orb_launch_routes import router

    paths = {getattr(route, "path", "") for route in router.routes}
    assert "/orb/subscription/webhook" in paths


def test_subscription_webhook_not_blocked_by_csrf_middleware():
    response, reached = asyncio.run(_dispatch_csrf_post("/orb/subscription/webhook"))
    assert reached is True
    assert response.status_code == 200


def test_unsigned_webhook_returns_signature_error_not_csrf():
    from routers.orb_billing_routes import orb_standalone_stripe_webhook

    request = _webhook_request(signature=None)
    conn = MagicMock()
    with patch("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_test"), patch(
        "routers.orb_billing_routes.STRIPE_WEBHOOK_SECRET", "whsec_test"
    ):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(orb_standalone_stripe_webhook(request, conn=conn))
    assert exc.value.status_code == 400
    assert exc.value.detail == "Missing Stripe-Signature header"
    assert exc.value.detail != "csrf_failed"


def test_invalid_webhook_signature_returns_400_not_csrf():
    from routers.orb_billing_routes import orb_standalone_stripe_webhook

    request = _webhook_request(signature="bad")
    conn = MagicMock()
    with patch("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_test"), patch(
        "routers.orb_billing_routes.STRIPE_WEBHOOK_SECRET", "whsec_test"
    ), patch(
        "routers.orb_billing_routes.stripe.Webhook.construct_event",
        side_effect=stripe.error.SignatureVerificationError("bad", "sig"),
    ):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(orb_standalone_stripe_webhook(request, conn=conn))
    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid webhook signature"
    assert exc.value.detail != "csrf_failed"


def test_protected_post_route_still_blocked_by_csrf():
    response, reached = asyncio.run(
        _dispatch_csrf_post("/orb/standalone/billing/checkout", session={"csrf_token": "expected"})
    )
    assert reached is False
    assert response.status_code == 403
    body = response.body.decode()
    assert "csrf_failed" in body


@patch("routers.orb_billing_routes.record_orb_stripe_event")
@patch("routers.orb_billing_routes.update_orb_subscription_state")
@patch("routers.orb_billing_routes._record_analytics")
@patch("routers.orb_billing_routes.is_orb_stripe_event_processed", return_value=False)
def test_checkout_completed_records_orb_stripe_event(mock_seen, mock_analytics, mock_update, mock_record):
    from routers.orb_billing_routes import orb_standalone_stripe_webhook

    request = _webhook_request()
    conn = MagicMock()
    subscription = {
        "status": "active",
        "current_period_start": 1,
        "current_period_end": 2,
        "items": {"data": [{"price": {"id": "price_orb"}}]},
        "cancel_at_period_end": False,
    }
    event = {
        "id": "evt_checkout_orb_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "metadata": {"product": "orb_residential", "user_id": "10"},
                "customer": "cus_10",
                "subscription": "sub_10",
            }
        },
    }
    with patch("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_test"), patch(
        "routers.orb_billing_routes.STRIPE_WEBHOOK_SECRET", "whsec_test"
    ), patch("routers.orb_billing_routes.stripe.Webhook.construct_event", return_value=event), patch(
        "routers.orb_billing_routes.stripe.Subscription.retrieve", return_value=subscription
    ):
        response = asyncio.run(orb_standalone_stripe_webhook(request, conn=conn))
    assert response.status_code == 200
    mock_record.assert_called_once()
    assert mock_record.call_args.kwargs["stripe_event_id"] == "evt_checkout_orb_1"
    assert mock_record.call_args.kwargs["status"] == "processed"


@patch("routers.orb_billing_routes.record_orb_stripe_event")
@patch("routers.orb_billing_routes.update_orb_subscription_state")
@patch("routers.orb_billing_routes._record_analytics")
@patch("routers.orb_billing_routes.is_orb_stripe_event_processed", return_value=False)
def test_checkout_completed_updates_orb_subscriptions_active(
    mock_seen, mock_analytics, mock_update, mock_record
):
    from routers.orb_billing_routes import orb_standalone_stripe_webhook

    request = _webhook_request()
    conn = MagicMock()
    subscription = {
        "status": "active",
        "current_period_start": 1,
        "current_period_end": 2,
        "items": {"data": [{"price": {"id": "price_orb"}}]},
        "cancel_at_period_end": False,
    }
    event = {
        "id": "evt_checkout_orb_2",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "metadata": {"product": "orb_residential", "user_id": "10"},
                "customer": "cus_10",
                "subscription": "sub_10",
            }
        },
    }
    with patch("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_test"), patch(
        "routers.orb_billing_routes.STRIPE_WEBHOOK_SECRET", "whsec_test"
    ), patch("routers.orb_billing_routes.stripe.Webhook.construct_event", return_value=event), patch(
        "routers.orb_billing_routes.stripe.Subscription.retrieve", return_value=subscription
    ):
        response = asyncio.run(orb_standalone_stripe_webhook(request, conn=conn))
    assert response.status_code == 200
    mock_update.assert_called_once()
    kwargs = mock_update.call_args.kwargs
    assert kwargs["user_id"] == 10
    assert kwargs["subscription_status"] == "active"
    assert kwargs["stripe_subscription_id"] == "sub_10"


@patch("routers.orb_billing_routes.record_orb_stripe_event")
@patch("routers.orb_billing_routes.update_orb_subscription_state")
@patch("routers.orb_billing_routes._record_analytics")
@patch("routers.orb_billing_routes.is_orb_stripe_event_processed", return_value=False)
def test_subscription_created_updated_events_are_idempotent(
    mock_seen, mock_analytics, mock_update, mock_record
):
    from routers.orb_billing_routes import orb_standalone_stripe_webhook

    request = _webhook_request()
    conn = MagicMock()
    for event_type in ("customer.subscription.created", "customer.subscription.updated"):
        mock_update.reset_mock()
        mock_record.reset_mock()
        event = {
            "id": f"evt_{event_type}_1",
            "type": event_type,
            "data": {
                "object": {
                    "id": "sub_same",
                    "customer": "cus_10",
                    "status": "active",
                    "metadata": {"product": "orb_residential", "user_id": "10"},
                    "current_period_start": 1,
                    "current_period_end": 2,
                    "cancel_at_period_end": False,
                    "items": {"data": [{"price": {"id": "price_orb"}}]},
                }
            },
        }
        with patch("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_test"), patch(
            "routers.orb_billing_routes.STRIPE_WEBHOOK_SECRET", "whsec_test"
        ), patch("routers.orb_billing_routes.stripe.Webhook.construct_event", return_value=event):
            response = asyncio.run(orb_standalone_stripe_webhook(request, conn=conn))
        assert response.status_code == 200
        mock_update.assert_called_once()
        mock_record.assert_called_once()


def test_duplicate_stripe_event_id_does_not_double_process():
    from routers.orb_billing_routes import orb_standalone_stripe_webhook

    request = _webhook_request()
    conn = MagicMock()
    event = {
        "id": "evt_dup_orb_1",
        "type": "customer.subscription.updated",
        "data": {"object": {"customer": "cus_10", "metadata": {"product": "orb_residential"}}},
    }
    with patch("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_test"), patch(
        "routers.orb_billing_routes.STRIPE_WEBHOOK_SECRET", "whsec_test"
    ), patch("routers.orb_billing_routes.stripe.Webhook.construct_event", return_value=event), patch(
        "routers.orb_billing_routes.is_orb_stripe_event_processed", return_value=True
    ), patch("routers.orb_billing_routes.update_orb_subscription_state") as mock_update, patch(
        "routers.orb_billing_routes.record_orb_stripe_event"
    ) as mock_record:
        response = asyncio.run(orb_standalone_stripe_webhook(request, conn=conn))
    assert response.status_code == 200
    assert "duplicate" in response.body.decode()
    mock_update.assert_not_called()
    mock_record.assert_not_called()
