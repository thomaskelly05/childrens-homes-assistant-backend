from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from middleware.orb_rate_limit_middleware import OrbRateLimitMiddleware
from services.security_rate_limit_service import RATE_LIMIT_RULES, _limiter_for, reset_rate_limiters_for_tests


@pytest.fixture(autouse=True)
def _reset():
    reset_rate_limiters_for_tests()
    yield
    reset_rate_limiters_for_tests()


def test_signup_rate_limit():
    rule = next(item for item in RATE_LIMIT_RULES if item.name == "orb_signup")
    _limiter_for(rule).max_requests = 1

    app = FastAPI()
    app.add_middleware(OrbRateLimitMiddleware)

    @app.post("/orb/standalone/auth/signup")
    def signup():
        return {"ok": True}

    client = TestClient(app)
    assert client.post("/orb/standalone/auth/signup").status_code == 200
    assert client.post("/orb/standalone/auth/signup").status_code == 429


def test_oauth_callback_not_rate_limited():
    rule = next(item for item in RATE_LIMIT_RULES if item.name == "oauth_start")
    _limiter_for(rule).max_requests = 1

    app = FastAPI()
    app.add_middleware(OrbRateLimitMiddleware)

    @app.get("/orb/standalone/auth/oauth/google/start")
    def oauth_start():
        return {"ok": "start"}

    @app.get("/orb/standalone/auth/oauth/google/callback")
    def oauth_callback():
        return {"ok": "callback"}

    client = TestClient(app)
    assert client.get("/orb/standalone/auth/oauth/google/start").status_code == 200
    assert client.get("/orb/standalone/auth/oauth/google/start").status_code == 429
    for _ in range(5):
        assert client.get("/orb/standalone/auth/oauth/google/callback").status_code == 200
