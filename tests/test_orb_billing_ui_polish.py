from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

from services.orb_access_service import orb_access_service

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_active_subscription_does_not_require_trial_state(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _c, _u, user=None: {
            "can_use_orb": True,
            "trial_active": True,
            "trial_available": False,
            "subscription_active": True,
            "subscription_status": "active",
            "safety_accepted": True,
            "trial": {"status": "active", "days_left": 7},
            "subscription": {"subscription_status": "active", "plan_name": "orb_residential_individual"},
        },
    )
    payload = orb_access_service.build_access_payload(9, conn=conn, user={"id": 9})
    assert payload["subscription"]["active"] is True
    assert payload["subscription"]["status"] == "active"
    assert payload["trial"]["active"] is True


def test_orb_billing_ui_has_no_direct_cancel_resume_buttons():
    paths = [
        FRONTEND / "components/orb-standalone/orb-billing-modal.tsx",
        FRONTEND / "components/orb-standalone/orb-billing-settings-section.tsx",
        FRONTEND / "components/orb-standalone/orb-upgrade-screen.tsx",
        FRONTEND / "components/orb-standalone/orb-account-modal.tsx",
        FRONTEND / "components/orb-residential/orb-account-menu.tsx",
    ]
    forbidden = ("Cancel subscription", "Resume subscription", "Reactivate subscription", "Pause subscription")
    for path in paths:
        text = path.read_text(encoding="utf-8")
        for phrase in forbidden:
            assert phrase not in text, f"{path.name} must not expose {phrase}"


def test_orb_billing_ui_uses_manage_billing_copy():
    billing_modal = (FRONTEND / "components/orb-standalone/orb-billing-modal.tsx").read_text(encoding="utf-8")
    settings = (FRONTEND / "components/orb-standalone/orb-billing-settings-section.tsx").read_text(encoding="utf-8")
    assert "Manage billing" in billing_modal
    assert "Manage billing" in settings
    assert "Manage subscription" not in billing_modal


def test_orb_billing_client_does_not_expose_cancel_route():
    client = (FRONTEND / "lib/orb/orb-billing-client.ts").read_text(encoding="utf-8")
    assert "subscription/cancel" not in client
