from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from middleware.security_middleware import SecurityHeadersMiddleware


@pytest.fixture()
def headers_client():
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)

    @app.get("/orb/standalone/access")
    def orb_access():
        return {"ok": True}

    return TestClient(app)


def test_security_headers_present_on_orb_path(headers_client):
    response = headers_client.get("/orb/standalone/access")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "SAMEORIGIN"
    assert response.headers.get("Referrer-Policy")
    csp = response.headers.get("Content-Security-Policy-Report-Only") or response.headers.get(
        "Content-Security-Policy"
    )
    assert csp
    assert "default-src 'self'" in csp
    assert "no-store" in response.headers.get("Cache-Control", "")
