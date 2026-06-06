from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from auth.orb_product_bootstrap_dependency import require_orb_product_bootstrap_access


def _allow_access(monkeypatch):
    monkeypatch.setattr(
        "auth.orb_product_bootstrap_dependency.orb_access_service.check_access",
        lambda _conn, user_id, workflow="ask_orb": MagicMock(
            allowed=True,
            access_state={"safety_accepted": True, "can_use_orb": True},
            reason="active",
        ),
    )


def _deny_premium(monkeypatch):
    monkeypatch.setattr(
        "auth.orb_product_bootstrap_dependency.orb_access_service.check_access",
        lambda _conn, user_id, workflow="ask_orb": MagicMock(
            allowed=False,
            access_state={"safety_accepted": True, "can_use_orb": False},
            reason="premium_subscription_required",
        ),
    )


def _deny_safety(monkeypatch):
    monkeypatch.setattr(
        "auth.orb_product_bootstrap_dependency.orb_access_service.check_access",
        lambda _conn, user_id, workflow="ask_orb": MagicMock(
            allowed=False,
            access_state={"safety_accepted": False, "can_use_orb": True},
            reason="safety_acceptance_required",
        ),
    )


def test_active_user_allowed(monkeypatch):
    _allow_access(monkeypatch)
    conn = MagicMock()
    user = require_orb_product_bootstrap_access(conn=conn, current_user={"user_id": 9, "id": 9})
    assert user["orb_access"]["can_use_orb"] is True


def test_inactive_user_returns_402(monkeypatch):
    _deny_premium(monkeypatch)
    conn = MagicMock()
    with pytest.raises(HTTPException) as exc:
        require_orb_product_bootstrap_access(conn=conn, current_user={"user_id": 9, "id": 9})
    assert exc.value.status_code == 402
    assert exc.value.detail["error"] == "premium_required"


def test_safety_required_returns_403(monkeypatch):
    _deny_safety(monkeypatch)
    conn = MagicMock()
    with pytest.raises(HTTPException) as exc:
        require_orb_product_bootstrap_access(conn=conn, current_user={"user_id": 9, "id": 9})
    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "safety_acceptance_required"


def test_missing_user_id_returns_401():
    conn = MagicMock()
    with pytest.raises(HTTPException) as exc:
        require_orb_product_bootstrap_access(conn=conn, current_user={})
    assert exc.value.status_code == 401
    assert exc.value.detail["error"] == "not_authenticated"
