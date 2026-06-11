from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from services.openai_header_sanitisation import (
    create_async_openai_client,
    create_sync_openai_client,
    infrastructure_error_message,
    is_infrastructure_error_message,
    is_openai_headers_too_large_error,
    reset_cached_openai_clients,
    sanitize_openai_headers,
)


def test_sanitize_openai_headers_drops_cookie_and_forwarded_headers():
    headers = {
        "Cookie": "session=" + ("a" * 5000),
        "Authorization": "Bearer user-token",
        "x-forwarded-for": "203.0.113.1",
        "cf-ray": "abc",
        "render-proxy": "1",
        "openai-organization": "org-test",
    }
    safe = sanitize_openai_headers(headers)
    assert "cookie" not in {k.lower() for k in safe}
    assert "authorization" not in {k.lower() for k in safe}
    assert safe == {"openai-organization": "org-test"}


def test_sanitize_openai_headers_returns_empty_for_none():
    assert sanitize_openai_headers(None) == {}


def test_is_openai_headers_too_large_error_detects_status_and_code():
    exc = MagicMock()
    exc.status_code = 431
    exc.body = {"code": "request_headers_too_large"}
    assert is_openai_headers_too_large_error(exc) is True


def test_infrastructure_error_message_is_prefixed():
    message = infrastructure_error_message()
    assert is_infrastructure_error_message(message)
    assert "openai_request_headers_too_large" in message


def test_create_sync_openai_client_uses_sanitised_headers_only(monkeypatch):
    captured: dict = {}

    class FakeOpenAI:
        def __init__(self, **kwargs):
            captured.update(kwargs)

    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setitem(
        __import__("sys").modules,
        "openai",
        type("openai", (), {"OpenAI": FakeOpenAI, "AsyncOpenAI": FakeOpenAI})(),
    )

    create_sync_openai_client(
        default_headers={
            "Cookie": "huge=" + ("x" * 4000),
            "openai-project": "proj-test",
        }
    )

    assert "default_headers" in captured
    assert captured["default_headers"] == {"openai-project": "proj-test"}
    assert "Cookie" not in captured["default_headers"]


def test_create_async_openai_client_has_no_browser_headers(monkeypatch):
    captured: dict = {}

    class FakeAsyncOpenAI:
        def __init__(self, **kwargs):
            captured.update(kwargs)

    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setitem(
        __import__("sys").modules,
        "openai",
        type("openai", (), {"OpenAI": FakeAsyncOpenAI, "AsyncOpenAI": FakeAsyncOpenAI})(),
    )

    create_async_openai_client(
        default_headers={"Cookie": "browser-session", "referer": "https://example.com"}
    )

    assert captured.get("default_headers") in (None, {})


def test_reset_cached_openai_clients_clears_gateway_cache():
    from services.ai_gateway_service import ai_gateway_service

    ai_gateway_service._client = object()  # noqa: SLF001
    reset_cached_openai_clients()
    assert ai_gateway_service._client is None
