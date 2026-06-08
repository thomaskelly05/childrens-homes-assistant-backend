from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import app as app_module
from db.connection import get_db
from services.orb_front_door_verdict_service import VERDICT_READY, VERDICT_UNAUTHENTICATED


def _trial_verdict_with_expires_at(expires_at: datetime) -> dict:
    return {
        "contract_version": "orb_front_door_v1",
        "verdict": VERDICT_READY,
        "authenticated": True,
        "can_use_orb": True,
        "access_blocker": None,
        "safety_accepted": True,
        "subscription": {
            "can_use_orb": True,
            "access_state": "trial_active",
            "access_blocker": None,
            "safety_accepted": True,
            "trial": {
                "available": False,
                "active": True,
                "days_left": 5,
                "expires_at": expires_at,
            },
            "subscription": {"active": False, "status": None, "plan_name": None},
            "billing": {"stripe_configured": True, "price_gbp_monthly": 9.99},
        },
        "user": {"id": 9, "email": "user@example.com"},
        "frontend_should_mount_product": True,
        "allowed_bootstrap": True,
        "backend_build": "test-build",
        "reason": "ready",
        "clear_session": False,
        "access": None,
    }


@pytest.fixture()
def front_door_client():
    conn = MagicMock()
    app_module.app.dependency_overrides[get_db] = lambda: conn
    client = TestClient(app_module.app)
    yield client
    app_module.app.dependency_overrides.clear()


def test_front_door_verdict_serializes_trial_expires_at_datetime(front_door_client):
    expires_at = datetime(2026, 6, 8, 12, 30, 0, tzinfo=timezone.utc)
    verdict = _trial_verdict_with_expires_at(expires_at)

    with patch("routers.orb_launch_routes.build_front_door_verdict", return_value=verdict):
        response = front_door_client.get("/orb/front-door/verdict")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    expires_value = body["data"]["subscription"]["trial"]["expires_at"]
    assert isinstance(expires_value, str)
    assert expires_value == expires_at.isoformat()


def test_front_door_verdict_does_not_500_with_datetime_in_subscription_trial(front_door_client):
    expires_at = datetime(2026, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
    verdict = _trial_verdict_with_expires_at(expires_at)

    with patch("routers.orb_launch_routes.build_front_door_verdict", return_value=verdict):
        response = front_door_client.get("/orb/front-door/verdict")

    assert response.status_code != 500
    assert response.status_code == 200


def test_front_door_verdict_unauthenticated_behaviour_unchanged(front_door_client):
    verdict = {
        "contract_version": "orb_front_door_v1",
        "verdict": VERDICT_UNAUTHENTICATED,
        "authenticated": False,
        "can_use_orb": False,
        "access_blocker": "unauthenticated",
        "safety_accepted": False,
        "subscription": {
            "can_use_orb": False,
            "access_state": "unauthenticated",
            "access_blocker": "unauthenticated",
            "safety_accepted": False,
            "trial": {
                "available": True,
                "active": False,
                "days_left": None,
                "expires_at": None,
            },
            "subscription": {"active": False, "status": None, "plan_name": None},
            "billing": {"stripe_configured": True, "price_gbp_monthly": 9.99},
        },
        "user": None,
        "frontend_should_mount_product": False,
        "allowed_bootstrap": False,
        "backend_build": "test-build",
        "reason": "no_session",
        "clear_session": False,
        "access": None,
    }

    with patch("routers.orb_launch_routes.build_front_door_verdict", return_value=verdict):
        response = front_door_client.get("/orb/front-door/verdict")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["verdict"] == VERDICT_UNAUTHENTICATED
    assert body["data"]["authenticated"] is False
    assert body["data"]["frontend_should_mount_product"] is False
