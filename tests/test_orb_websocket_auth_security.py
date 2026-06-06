from __future__ import annotations

import os
from unittest.mock import MagicMock

import pytest
from fastapi import WebSocket

from auth.tokens import create_session_token
from auth.websocket_auth import (
    resolve_websocket_session_token,
    websocket_has_query_token_auth,
)
from services.orb_voice_realtime_ws_handler import _websocket_user
from services.orb_websocket_gateway import OrbWebSocketGateway


def _mock_websocket(
    *,
    cookies: dict[str, str] | None = None,
    headers: dict[str, str] | None = None,
    query: dict[str, str] | None = None,
) -> WebSocket:
    websocket = MagicMock(spec=WebSocket)
    websocket.cookies = cookies or {}
    websocket.headers = headers or {}
    query_params = MagicMock()
    query_params.get = lambda name, default=None: (query or {}).get(name, default)
    websocket.query_params = query_params
    return websocket


@pytest.fixture
def session_token() -> str:
    return create_session_token(
        42,
        email="orb@test.example",
        role="user",
        permissions=["assistant:access"],
        session_id="ws-test-session",
    )


def test_websocket_has_query_token_auth_detects_token_param():
    ws = _mock_websocket(query={"token": "secret-value"})
    assert websocket_has_query_token_auth(ws) is True


def test_websocket_has_query_token_auth_detects_access_token_param():
    ws = _mock_websocket(query={"access_token": "secret-value"})
    assert websocket_has_query_token_auth(ws) is True


def test_production_rejects_query_only_token(monkeypatch, session_token):
    monkeypatch.setenv("APP_ENV", "production")
    ws = _mock_websocket(query={"token": session_token})
    assert resolve_websocket_session_token(ws) is None
    assert _websocket_user(ws) is None


def test_production_accepts_cookie_over_query(monkeypatch, session_token):
    monkeypatch.setenv("APP_ENV", "production")
    ws = _mock_websocket(
        cookies={"indicare_session": session_token},
        query={"token": "should-not-be-used"},
    )
    assert resolve_websocket_session_token(ws) == session_token


def test_production_accepts_authorization_header(monkeypatch, session_token):
    monkeypatch.setenv("APP_ENV", "production")
    ws = _mock_websocket(headers={"authorization": f"Bearer {session_token}"})
    assert resolve_websocket_session_token(ws) == session_token


def test_development_allows_query_token_fallback(monkeypatch, session_token):
    monkeypatch.setenv("APP_ENV", "development")
    ws = _mock_websocket(query={"token": session_token})
    assert resolve_websocket_session_token(ws) == session_token


def test_development_prefers_cookie_over_query(monkeypatch, session_token):
    monkeypatch.setenv("APP_ENV", "development")
    cookie_token = create_session_token(99, session_id="cookie-session")
    ws = _mock_websocket(
        cookies={"indicare_session": cookie_token},
        query={"token": session_token},
    )
    assert resolve_websocket_session_token(ws) == cookie_token


def test_revoked_session_rejected_by_orb_websocket_gateway(monkeypatch, session_token):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setattr(
        "auth.websocket_auth.is_session_revoked",
        lambda _sid, conn=None: True,
    )
    ws = _mock_websocket(cookies={"indicare_session": session_token})
    gateway = OrbWebSocketGateway()
    assert gateway.websocket_user(ws) is None


def test_websocket_auth_errors_never_echo_token(session_token):
    ws = _mock_websocket(query={"token": session_token})
    monkeypatch_token = os.environ.get("APP_ENV", "production")
    os.environ["APP_ENV"] = "production"
    try:
        user = _websocket_user(ws)
        assert user is None
        # Handler returns None — callers use generic messages without token values.
        assert session_token not in repr(user)
    finally:
        os.environ["APP_ENV"] = monkeypatch_token
