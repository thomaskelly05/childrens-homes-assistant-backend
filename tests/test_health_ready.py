from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

import app as app_module
import db.connection as connection


def test_health_liveness_returns_ok_without_database():
    connection.db_pool = None
    connection._last_pool_init_failure_at = connection.time.monotonic()
    client = TestClient(app_module.app)

    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["check"] == "health"


def test_health_ready_returns_503_when_database_unavailable():
    connection.db_pool = None
    connection._last_pool_init_failure_at = connection.time.monotonic()
    client = TestClient(app_module.app)

    response = client.get("/health/ready")

    assert response.status_code == 503
    body = response.json()
    assert body["ok"] is False
    assert body["database"]["available"] is False


def test_health_ready_returns_ok_when_pool_available():
    mock_pool = object()
    with patch.object(connection, "db_pool", mock_pool), patch.object(
        connection, "is_pool_init_in_cooldown", return_value=False
    ):
        client = TestClient(app_module.app)
        response = client.get("/health/ready")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["status"] == "ready"
