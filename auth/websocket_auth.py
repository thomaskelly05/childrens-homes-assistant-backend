from __future__ import annotations

import os
from typing import Any

from fastapi import WebSocket

from auth.routes import settings as auth_settings
from auth.tokens import decode_session_token
from services.session_security_service import is_session_revoked

_SENSITIVE_QUERY_PARAM_NAMES = frozenset({"token", "access_token"})


def is_production_app_env() -> bool:
    return os.getenv("APP_ENV", "development").strip().lower() == "production"


def websocket_has_query_token_auth(websocket: WebSocket) -> bool:
    for name in _SENSITIVE_QUERY_PARAM_NAMES:
        if (websocket.query_params.get(name) or "").strip():
            return True
    return False


def resolve_websocket_session_token(websocket: WebSocket) -> str | None:
    """Resolve a session token for WebSocket handshakes.

    Cookie and Authorization header are preferred in all environments.
    Query-string tokens are rejected in production to avoid log/Referer leakage.
    Non-production may still accept ``?token=`` for local OAuth/dev tooling only.
    """
    query_token_present = websocket_has_query_token_auth(websocket)

    token = (websocket.cookies.get(auth_settings.session_cookie_name) or "").strip()
    if not token:
        auth = websocket.headers.get("authorization") or ""
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()

    if token:
        return token

    if is_production_app_env():
        return None

    if not query_token_present:
        return None

    for name in _SENSITIVE_QUERY_PARAM_NAMES:
        candidate = (websocket.query_params.get(name) or "").strip()
        if candidate:
            return candidate
    return None


def decode_websocket_session_payload(token: str) -> dict[str, Any] | None:
    return decode_session_token(token)


def websocket_session_is_revoked(payload: dict[str, Any]) -> bool:
    session_id = payload.get("sid")
    return bool(session_id and is_session_revoked(str(session_id)))
