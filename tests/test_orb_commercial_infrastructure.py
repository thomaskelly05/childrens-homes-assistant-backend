from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException


def test_spending_cap_endpoint_shape():
    from routers.orb_usage_routes import OrbSpendingCapRequest, set_orb_spending_cap

    conn = MagicMock()
    current_user = {"user_id": 7, "email": "u@test.com", "role": "orb_residential"}
    payload = OrbSpendingCapRequest(monthly_cap_pence=1000, warning_threshold_percent=80, allow_overage=False)
    import asyncio

    with patch("routers.orb_usage_routes.upsert_orb_usage_preferences") as mock_upsert:
        mock_upsert.return_value = {
            "monthly_cap_pence": 1000,
            "warning_threshold_percent": 80,
            "allow_overage": False,
        }
        result = asyncio.run(set_orb_spending_cap(payload, conn=conn, current_user=current_user))
    assert result["ok"] is True
    assert result["monthly_cap_pence"] == 1000


def test_top_up_checkout_rejects_invalid_amount():
    from routers.orb_usage_routes import OrbTopUpCheckoutRequest, orb_top_up_checkout

    conn = MagicMock()
    current_user = {"user_id": 1, "email": "u@test.com"}
    import asyncio

    with patch("routers.orb_usage_routes.STRIPE_SECRET_KEY", "sk_test"):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(
                orb_top_up_checkout(
                    OrbTopUpCheckoutRequest(amount_pence=999),
                    conn=conn,
                    current_user=current_user,
                )
            )
    assert exc.value.status_code == 400


@patch("routers.orb_usage_routes.stripe.checkout.Session.create")
@patch("routers.orb_usage_routes.get_orb_subscription", return_value={"stripe_customer_id": "cus_1"})
def test_top_up_checkout_returns_url(mock_sub, mock_session):
    from routers.orb_usage_routes import OrbTopUpCheckoutRequest, orb_top_up_checkout

    mock_session.return_value = MagicMock(url="https://checkout.stripe.com/topup")
    conn = MagicMock()
    current_user = {"user_id": 1, "email": "u@test.com"}
    import asyncio

    with patch("routers.orb_usage_routes.STRIPE_SECRET_KEY", "sk_test"):
        result = asyncio.run(
            orb_top_up_checkout(
                OrbTopUpCheckoutRequest(amount_pence=500),
                conn=conn,
                current_user=current_user,
            )
        )
    assert result["checkout_url"].startswith("https://checkout.stripe.com")
    kwargs = mock_session.call_args.kwargs
    assert kwargs["automatic_payment_methods"] == {"enabled": True}
    assert kwargs["mode"] == "payment"


def test_project_memory_in_framed_message():
    from routers.orb_standalone_routes import OrbStandaloneConversationRequest, _build_standalone_request_context

    payload = OrbStandaloneConversationRequest(
        message="Hello",
        project_memory="Focus on recording quality for My Home.",
    )
    ctx = _build_standalone_request_context(payload)
    assert "User-selected ORB project context" in ctx["framed_message"]
    assert "not verified live IndiCare OS record data" in ctx["framed_message"]


def test_subscription_portal_route_delegates():
    from routers.orb_launch_routes import orb_subscription_portal

    conn = MagicMock()
    current_user = {"user_id": 3, "email": "u@test.com"}
    import asyncio

    with patch("routers.orb_billing_routes.orb_standalone_billing_portal") as mock_portal:
        mock_portal.return_value = {"success": True, "portal_url": "https://billing.stripe.com/p/session"}
        result = asyncio.run(orb_subscription_portal(conn=conn, current_user=current_user))
    assert result["portal_url"].startswith("https://billing.stripe.com")
