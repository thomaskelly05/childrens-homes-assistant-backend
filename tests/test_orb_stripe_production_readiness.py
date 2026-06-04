from __future__ import annotations

"""Stripe production readiness — env diagnostics and checkout errors."""

from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

REPO_ROOT = Path(__file__).resolve().parents[1]

REQUIRED_WEBHOOK_EVENTS = {
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
}


def test_stripe_config_warnings_list_missing_key(monkeypatch):
    from services.orb_production_config_service import stripe_config_warnings

    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.delenv("ORB_RESIDENTIAL_STRIPE_PRICE_ID", raising=False)
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    warnings = stripe_config_warnings()
    assert any("STRIPE_SECRET_KEY" in w for w in warnings)
    assert any("ORB_RESIDENTIAL_STRIPE_PRICE_ID" in w for w in warnings)
    assert any("STRIPE_WEBHOOK_SECRET" in w for w in warnings)


def test_checkout_503_messages_are_explicit(monkeypatch):
    from routers.orb_billing_routes import OrbCheckoutRequest, orb_standalone_checkout

    import asyncio

    monkeypatch.setattr("routers.orb_billing_routes.STRIPE_SECRET_KEY", "")
    conn = MagicMock()
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            orb_standalone_checkout(
                OrbCheckoutRequest(),
                conn=conn,
                current_user={"user_id": 1, "email": "u@test.com"},
            )
        )
    assert exc.value.status_code == 503
    assert "STRIPE_SECRET_KEY" in str(exc.value.detail)


def test_webhook_handler_covers_documented_events():
    source = (REPO_ROOT / "routers/orb_billing_routes.py").read_text(encoding="utf-8")
    for event in REQUIRED_WEBHOOK_EVENTS:
        assert event in source, f"Handler should reference {event}"


def test_stripe_docs_list_required_env_vars():
    doc = (REPO_ROOT / "docs/orb-stripe-production-readiness.md").read_text(encoding="utf-8")
    for var in (
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "ORB_RESIDENTIAL_STRIPE_PRICE_ID",
    ):
        assert var in doc
    for event in REQUIRED_WEBHOOK_EVENTS:
        assert event in doc


def test_frontend_billing_client_has_no_secret_keys():
    text = (REPO_ROOT / "frontend-next/lib/orb/orb-billing-client.ts").read_text(encoding="utf-8")
    assert "sk_live" not in text
    assert "sk_test" not in text
    assert "STRIPE_SECRET_KEY" not in text


def test_billing_modal_preserves_checkout_loading_state():
    text = (REPO_ROOT / "frontend-next/components/orb-standalone/orb-billing-modal.tsx").read_text(
        encoding="utf-8"
    )
    assert "checkoutOpening" in text
    assert "data-orb-billing-refresh" in text
