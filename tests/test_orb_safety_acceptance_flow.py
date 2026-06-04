from __future__ import annotations

"""Safety acceptance gate — must remain after subscription."""

from pathlib import Path
from unittest.mock import MagicMock

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_safety_blocks_premium_even_when_raw_can_use_orb(monkeypatch):
    from services.orb_access_service import orb_access_service

    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _c, _u, user=None: {
            "can_use_orb": True,
            "subscription_active": True,
            "trial_active": False,
            "safety_accepted": False,
            "subscription": {"subscription_status": "active"},
        },
    )
    decision = orb_access_service.check_access(conn, user_id=10, workflow="ask_orb")
    assert decision.allowed is False
    assert decision.reason == "safety_acceptance_required"


def test_safety_modal_copy_explains_post_payment_step():
    text = (REPO_ROOT / "frontend-next/components/orb-residential/orb-safety-modal.tsx").read_text(
        encoding="utf-8"
    )
    assert "Before using ORB" in text
    assert "data-orb-safety-modal" in text
    assert "data-orb-safety-subscription-note" in text
    assert "not a" in text.lower() and "payment" in text.lower()
    assert "safeguarding" in text.lower()
    assert "emergency" in text.lower()
    assert "review" in text.lower()


def test_safety_accept_route_exists():
    from routers.orb_billing_routes import router

    paths = {getattr(route, "path", "") for route in router.routes}
    assert "/orb/standalone/safety/accept" in paths


def test_orb_shell_shows_safety_modal_when_not_accepted():
    text = (REPO_ROOT / "frontend-next/components/orb/orb-shell.tsx").read_text(encoding="utf-8")
    assert "OrbSafetyModal" in text
    assert "safetyAccepted" in text
