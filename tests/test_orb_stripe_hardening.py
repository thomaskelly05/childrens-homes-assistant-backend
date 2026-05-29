from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException


def _webhook_request() -> MagicMock:
    request = MagicMock()
    request.body = AsyncMock(return_value=b"{}")
    request.headers = {"stripe-signature": "sig"}
    return request


def test_invalid_webhook_signature_rejected():
    from routers.orb_billing_routes import orb_standalone_stripe_webhook

    request = _webhook_request()
    request.headers = {"stripe-signature": "bad"}
    conn = MagicMock()
    import asyncio

    import stripe

    with patch("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_test"), patch(
        "routers.orb_billing_routes.STRIPE_WEBHOOK_SECRET", "whsec_test"
    ):
        with patch(
            "routers.orb_billing_routes.stripe.Webhook.construct_event",
            side_effect=stripe.error.SignatureVerificationError("bad", "sig"),
        ):
            with pytest.raises(HTTPException) as exc:
                asyncio.run(orb_standalone_stripe_webhook(request, conn=conn))
    assert exc.value.status_code == 400


def test_duplicate_webhook_is_idempotent():
    from routers.orb_billing_routes import orb_standalone_stripe_webhook

    request = _webhook_request()
    conn = MagicMock()
    import asyncio

    event = {"id": "evt_dup_1", "type": "invoice.payment_succeeded", "data": {"object": {}}}
    with patch("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_test"), patch(
        "routers.orb_billing_routes.STRIPE_WEBHOOK_SECRET", "whsec_test"
    ):
        with patch("routers.orb_billing_routes.stripe.Webhook.construct_event", return_value=event):
            with patch("routers.orb_billing_routes.is_orb_stripe_event_processed", return_value=True):
                response = asyncio.run(orb_standalone_stripe_webhook(request, conn=conn))
    assert response.status_code == 200
    body = response.body.decode()
    assert "duplicate" in body


@patch("routers.orb_billing_routes.record_orb_stripe_event")
@patch("routers.orb_billing_routes.update_orb_subscription_state")
@patch("routers.orb_billing_routes._record_analytics")
@patch("routers.orb_billing_routes.is_orb_stripe_event_processed", return_value=False)
def test_checkout_completed_updates_orb_subscription(mock_seen, mock_analytics, mock_update, mock_record):
    from routers.orb_billing_routes import orb_standalone_stripe_webhook

    request = _webhook_request()
    conn = MagicMock()
    import asyncio

    subscription = {
        "status": "active",
        "current_period_start": 1,
        "current_period_end": 2,
        "items": {"data": [{"price": {"id": "price_orb"}}]},
        "cancel_at_period_end": False,
    }
    event = {
        "id": "evt_checkout_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "metadata": {"product": "orb_residential", "user_id": "9"},
                "customer": "cus_1",
                "subscription": "sub_1",
            }
        },
    }
    with patch("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_test"), patch(
        "routers.orb_billing_routes.STRIPE_WEBHOOK_SECRET", "whsec_test"
    ):
        with patch("routers.orb_billing_routes.stripe.Webhook.construct_event", return_value=event):
            with patch("routers.orb_billing_routes.stripe.Subscription.retrieve", return_value=subscription):
                response = asyncio.run(orb_standalone_stripe_webhook(request, conn=conn))
    assert response.status_code == 200
    mock_update.assert_called()
    mock_record.assert_called()
    kwargs = mock_update.call_args.kwargs
    assert kwargs["user_id"] == 9


@patch("routers.orb_billing_routes.record_orb_stripe_event")
@patch("routers.orb_billing_routes.update_orb_subscription_state")
@patch("routers.orb_billing_routes.is_orb_stripe_event_processed", return_value=False)
def test_subscription_deleted_locks_orb_only(mock_seen, mock_update, mock_record):
    from routers.orb_billing_routes import orb_standalone_stripe_webhook

    request = _webhook_request()
    conn = MagicMock()
    import asyncio

    event = {
        "id": "evt_del_1",
        "type": "customer.subscription.deleted",
        "data": {"object": {"customer": "cus_9", "metadata": {"product": "orb_residential"}}},
    }
    with patch("routers.orb_billing_routes.STRIPE_SECRET_KEY", "sk_test"), patch(
        "routers.orb_billing_routes.STRIPE_WEBHOOK_SECRET", "whsec_test"
    ):
        with patch("routers.orb_billing_routes.stripe.Webhook.construct_event", return_value=event):
            response = asyncio.run(orb_standalone_stripe_webhook(request, conn=conn))
    assert response.status_code == 200
    mock_update.assert_called()
    assert mock_update.call_args.kwargs["subscription_status"] == "cancelled"


def test_default_success_url_points_to_billing_success_page():
    from routers.orb_billing_routes import _default_success_url

    with patch.dict("os.environ", {"FRONTEND_APP_URL": "http://localhost:3001"}, clear=False):
        url = _default_success_url(None)
    assert url.endswith("/orb/billing/success")


def test_plan_service_never_grants_os_access():
    from services.orb_subscription_plan_service import orb_subscription_plan_service

    plan = orb_subscription_plan_service.current_plan_payload(user={"id": 1, "role": "orb_residential"})
    assert plan["os_access_granted"] is False
