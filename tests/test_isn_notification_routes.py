from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app import app
from services.isn_digest_service import isn_digest_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_isn_memory():
    isn_digest_service._memory_alerts = {}
    yield
    isn_digest_service._memory_alerts = {}


def test_isn_notification_health_requires_auth():
    response = client.get("/api/isn/notifications/health")
    assert response.status_code in (401, 403, 422)


def test_isn_digest_service_contract(fake_state):
    isn_digest_service.seed_memory_alert()
    digest = isn_digest_service.build_digest(fake_state["user"], conn=None)
    assert digest.privacy_notice
    assert digest.available
    assert digest.total_open >= 1
    assert digest.top_items
    assert all(item.safe_summary for item in digest.top_items)


def test_isn_routes_registered():
    from routers import isn_notification_routes

    paths = [getattr(r, "path", "") for r in isn_notification_routes.router.routes]
    assert "/api/isn/notifications/health" in paths or any("health" in p for p in paths)
    assert any("digest" in p for p in paths)
    assert any("badge-summary" in p for p in paths)
    assert any("items" in p for p in paths)
