from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from auth.errors import unauthorised
from auth.orb_residential_auth_loader import get_orb_residential_user
from auth.tokens import create_session_token


def _mock_request(token: str | None = None) -> MagicMock:
    request = MagicMock()
    request.cookies = {"indicare_session": token} if token else {}
    request.headers = {}
    return request


def test_valid_session_loads_residential_user(monkeypatch):
    token = create_session_token(7, email="orb@test.example", role="user", session_id="active-sid")
    monkeypatch.setattr(
        "auth.orb_residential_auth_loader.decode_session_token",
        lambda _token: {"sub": "7", "sid": "active-sid", "role": "user"},
    )
    monkeypatch.setattr(
        "auth.orb_residential_auth_loader._enforce_session_state",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(
        "auth.orb_residential_auth_loader._load_active_user",
        lambda _conn, _uid: {
            "id": 7,
            "email": "orb@test.example",
            "role": "user",
            "home_id": None,
            "provider_id": None,
        },
    )

    user = get_orb_residential_user(_mock_request(token), None, MagicMock())
    assert user["user_id"] == 7
    assert user["email"] == "orb@test.example"


def test_missing_session_rejected():
    with pytest.raises(HTTPException) as exc:
        get_orb_residential_user(_mock_request(None), None, MagicMock())
    assert exc.value.status_code == 401


def test_revoked_session_rejected(monkeypatch):
    token = create_session_token(7, session_id="revoked-sid")
    monkeypatch.setattr(
        "auth.orb_residential_auth_loader.decode_session_token",
        lambda _token: {"sub": "7", "sid": "revoked-sid"},
    )

    def _raise_revoked(*_args, **_kwargs):
        raise unauthorised("session_revoked", "Session has been revoked")

    monkeypatch.setattr(
        "auth.orb_residential_auth_loader._enforce_session_state",
        _raise_revoked,
    )

    with pytest.raises(HTTPException) as exc:
        get_orb_residential_user(_mock_request(token), None, MagicMock())
    assert exc.value.status_code == 401
    detail = exc.value.detail
    assert isinstance(detail, dict)
    assert detail.get("code") == "session_revoked"
    assert token not in str(detail)


def test_invalid_token_rejected(monkeypatch):
    monkeypatch.setattr(
        "auth.orb_residential_auth_loader.decode_session_token",
        lambda _token: None,
    )
    with pytest.raises(HTTPException) as exc:
        get_orb_residential_user(_mock_request("bad-token"), None, MagicMock())
    assert exc.value.status_code == 401
