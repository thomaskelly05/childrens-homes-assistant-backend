from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from services.orb_front_door_verdict_service import (
    VERDICT_INACTIVE,
    VERDICT_READY,
    VERDICT_RETRY,
    VERDICT_SAFETY_REQUIRED,
    VERDICT_UNAUTHENTICATED,
    build_front_door_verdict,
)


def test_verdict_unauthenticated_without_token(monkeypatch):
    request = MagicMock()
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service._get_request_token",
        lambda _request, _token: None,
    )
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service.orb_access_service.build_access_payload",
        lambda _user_id, conn=None, user=None: {"access_state": "unauthenticated", "can_use_orb": False},
    )
    verdict = build_front_door_verdict(request, conn=MagicMock(), bearer_token=None)
    assert verdict["verdict"] == VERDICT_UNAUTHENTICATED
    assert verdict["authenticated"] is False
    assert verdict["frontend_should_mount_product"] is False


def test_verdict_ready_for_active_user(monkeypatch):
    request = MagicMock()
    user = {"user_id": 9, "id": 9, "email": "user@example.com"}
    access = {
        "can_use_orb": True,
        "safety_accepted": True,
        "access_state": "subscription_active",
        "trial": {"active": False},
        "subscription": {"active": True},
    }
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service._get_request_token",
        lambda _request, _token: "token",
    )
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service.get_orb_residential_user",
        lambda _request, _token, _conn: user,
    )
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service.orb_access_service.build_access_payload",
        lambda _user_id, conn=None, user=None: access,
    )
    verdict = build_front_door_verdict(request, conn=MagicMock(), bearer_token="token")
    assert verdict["verdict"] == VERDICT_READY
    assert verdict["authenticated"] is True
    assert verdict["frontend_should_mount_product"] is True
    assert verdict["allowed_bootstrap"] is True


def test_verdict_inactive_when_subscription_missing(monkeypatch):
    request = MagicMock()
    user = {"user_id": 9, "id": 9, "email": "user@example.com"}
    access = {
        "can_use_orb": False,
        "safety_accepted": True,
        "access_state": "authenticated_no_subscription",
        "trial": {"active": False},
        "subscription": {"active": False},
    }
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service._get_request_token",
        lambda _request, _token: "token",
    )
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service.get_orb_residential_user",
        lambda _request, _token, _conn: user,
    )
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service.orb_access_service.build_access_payload",
        lambda _user_id, conn=None, user=None: access,
    )
    verdict = build_front_door_verdict(request, conn=MagicMock(), bearer_token="token")
    assert verdict["verdict"] == VERDICT_INACTIVE


def test_verdict_safety_required(monkeypatch):
    request = MagicMock()
    user = {"user_id": 9, "id": 9, "email": "user@example.com"}
    access = {
        "can_use_orb": False,
        "safety_accepted": False,
        "access_blocker": "safety_acceptance",
        "access_state": "trial_active",
        "trial": {"active": True},
        "subscription": {"active": False},
    }
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service._get_request_token",
        lambda _request, _token: "token",
    )
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service.get_orb_residential_user",
        lambda _request, _token, _conn: user,
    )
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service.orb_access_service.build_access_payload",
        lambda _user_id, conn=None, user=None: access,
    )
    verdict = build_front_door_verdict(request, conn=MagicMock(), bearer_token="token")
    assert verdict["verdict"] == VERDICT_SAFETY_REQUIRED


def test_verdict_retry_on_db_error(monkeypatch):
    request = MagicMock()
    user = {"user_id": 9, "id": 9, "email": "user@example.com"}
    access = {
        "can_use_orb": False,
        "safety_accepted": False,
        "db_error": "access_state_unavailable",
        "trial": {"active": False},
        "subscription": {"active": False},
    }
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service._get_request_token",
        lambda _request, _token: "token",
    )
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service.get_orb_residential_user",
        lambda _request, _token, _conn: user,
    )
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service.orb_access_service.build_access_payload",
        lambda _user_id, conn=None, user=None: access,
    )
    verdict = build_front_door_verdict(request, conn=MagicMock(), bearer_token="token")
    assert verdict["verdict"] == VERDICT_RETRY


def test_verdict_invalid_session_clears_session(monkeypatch):
    request = MagicMock()
    monkeypatch.setattr(
        "services.orb_front_door_verdict_service._get_request_token",
        lambda _request, _token: "bad-token",
    )

    def _raise_401(*_args, **_kwargs):
        raise HTTPException(status_code=401, detail={"error": "session_invalid"})

    monkeypatch.setattr(
        "services.orb_front_door_verdict_service.get_orb_residential_user",
        _raise_401,
    )
    verdict = build_front_door_verdict(request, conn=MagicMock(), bearer_token="bad-token")
    assert verdict["verdict"] == VERDICT_UNAUTHENTICATED
    assert verdict["clear_session"] is True
