from __future__ import annotations

import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.responses import JSONResponse

from middleware.orb_rate_limit_middleware import OrbRateLimitMiddleware
from services.security_rate_limit_service import (
    RATE_LIMIT_RULES,
    _limiter_for,
    reset_rate_limiters_for_tests,
)


@pytest.fixture(autouse=True)
def _reset_limiters():
    reset_rate_limiters_for_tests()
    yield
    reset_rate_limiters_for_tests()


@pytest.fixture()
def rate_limit_client(monkeypatch):
    monkeypatch.setenv("DISABLE_RATE_LIMITING", "false")
    app = FastAPI()
    app.add_middleware(OrbRateLimitMiddleware)

    @app.post("/auth/login")
    def login():
        return {"ok": True}

    @app.post("/orb/standalone/conversation")
    def chat():
        return {"ok": True}

    return TestClient(app)


def test_login_rate_limit_returns_429_safely(rate_limit_client):
    rule = next(item for item in RATE_LIMIT_RULES if item.name == "auth_login")
    limiter = _limiter_for(rule)
    limiter.max_requests = 2
    for _ in range(2):
        assert rate_limit_client.post("/auth/login").status_code == 200
    response = rate_limit_client.post("/auth/login")
    assert response.status_code == 429
    body = response.json()
    assert body["code"] == "rate_limit_exceeded"
    assert "policy" in body
    assert "traceback" not in response.text.lower()


def test_stripe_webhook_is_exempt(rate_limit_client):
    app = rate_limit_client.app

    @app.post("/orb/standalone/billing/webhook")
    def webhook():
        return JSONResponse({"ok": True})

    client = TestClient(app)
    for _ in range(50):
        assert client.post("/orb/standalone/billing/webhook").status_code == 200


def test_ai_route_rate_limit_returns_429_safely():
    rule = next(item for item in RATE_LIMIT_RULES if item.name == "orb_chat")
    limiter = _limiter_for(rule)
    limiter.max_requests = 1

    app = FastAPI()
    app.add_middleware(OrbRateLimitMiddleware)

    @app.post("/orb/standalone/conversation")
    def chat():
        return {"ok": True}

    client = TestClient(app)
    assert client.post("/orb/standalone/conversation").status_code == 200
    blocked = client.post("/orb/standalone/conversation")
    assert blocked.status_code == 429
    assert blocked.json()["policy"] == "orb_chat"
