from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from auth.orb_dictate_dependency import require_orb_dictate_access
from auth.orb_standalone_premium_dependency import require_rich_orb_premium_access
from routers.orb_projects_routes import require_orb_projects_access
from routers.orb_voice_residential_routes import require_orb_voice_premium
from services.orb_access_service import orb_access_service


def _deny_access(monkeypatch):
    monkeypatch.setattr(
        "auth.orb_standalone_premium_dependency.orb_access_service.check_access",
        lambda _conn, user_id, workflow="ask_orb": MagicMock(
            allowed=False,
            access_state={"safety_accepted": True, "can_use_orb": False},
            reason="premium_subscription_required",
        ),
    )
    monkeypatch.setattr(
        "auth.orb_residential_dependencies.orb_access_service.check_access",
        lambda _conn, user_id, workflow="ask_orb": MagicMock(
            allowed=False,
            access_state={"safety_accepted": True, "can_use_orb": False},
            reason="premium_subscription_required",
        ),
    )


def test_inactive_user_blocked_from_standalone_premium(monkeypatch):
    _deny_access(monkeypatch)
    conn = MagicMock()
    with pytest.raises(HTTPException) as exc:
        require_rich_orb_premium_access(conn=conn, current_user={"user_id": 5, "id": 5})
    assert exc.value.status_code == 402
    assert exc.value.detail["error"] == "premium_required"


def test_inactive_user_blocked_from_dictate(monkeypatch):
    _deny_access(monkeypatch)
    conn = MagicMock()
    request = MagicMock()
    with pytest.raises(HTTPException) as exc:
        require_orb_dictate_access(request=request, conn=conn, current_user={"user_id": 5, "id": 5})
    assert exc.value.status_code == 402


def test_inactive_user_blocked_from_voice_premium(monkeypatch):
    _deny_access(monkeypatch)
    conn = MagicMock()
    request = MagicMock()
    with pytest.raises(HTTPException) as exc:
        require_orb_voice_premium(request=request, conn=conn, current_user={"user_id": 5, "id": 5})
    assert exc.value.status_code == 402


def test_inactive_user_blocked_from_projects(monkeypatch):
    _deny_access(monkeypatch)
    conn = MagicMock()
    request = MagicMock()
    with pytest.raises(HTTPException) as exc:
        require_orb_projects_access(request=request, conn=conn, current_user={"user_id": 5, "id": 5})
    assert exc.value.status_code == 402


def test_active_trial_user_allowed(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "services.orb_access_service.get_orb_access_state",
        lambda _conn, _uid, user=None: {
            "can_use_orb": True,
            "trial_active": True,
            "subscription_active": False,
            "safety_accepted": True,
            "subscription": {},
        },
    )
    decision = orb_access_service.check_access(conn, user_id=7, workflow="ask_orb")
    assert decision.allowed is True


def test_safety_not_accepted_blocks_premium(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(
        "auth.orb_standalone_premium_dependency.orb_access_service.check_access",
        lambda _conn, user_id, workflow="ask_orb": MagicMock(
            allowed=False,
            access_state={"safety_accepted": False, "can_use_orb": True},
            reason="safety_acceptance_required",
        ),
    )
    with pytest.raises(HTTPException) as exc:
        require_rich_orb_premium_access(conn=conn, current_user={"user_id": 8, "id": 8})
    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "safety_acceptance_required"
