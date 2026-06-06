from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException


def test_checkout_requires_authenticated_user():
    from auth.orb_residential_dependencies import require_orb_residential_auth

    with pytest.raises(HTTPException) as exc:
        require_orb_residential_auth(current_user={})
    assert exc.value.status_code in {401, 403}


def test_portal_requires_authenticated_user():
    from auth.orb_residential_dependencies import require_orb_residential_auth

    with pytest.raises(HTTPException) as exc:
        require_orb_residential_auth(current_user={"email": "x@test.com"})
    assert exc.value.status_code in {401, 403}


def test_checkout_requires_stripe_configuration(monkeypatch):
    from routers.orb_billing_routes import OrbCheckoutRequest, orb_standalone_checkout

    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "")
    conn = MagicMock()
    import asyncio

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            orb_standalone_checkout(
                OrbCheckoutRequest(),
                conn=conn,
                current_user={"user_id": 1, "email": "u@test.com"},
            )
        )
    assert exc.value.status_code == 503


def test_webhook_rejects_invalid_signature():
    from routers.orb_billing_routes import orb_standalone_stripe_webhook

    request = MagicMock()
    request.body = AsyncMock(return_value=b"{}")
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


def test_csrf_exempt_includes_orb_webhook():
    from middleware.security_middleware import CSRF_EXEMPT_PREFIXES

    assert "/orb/standalone/billing/webhook" in CSRF_EXEMPT_PREFIXES
