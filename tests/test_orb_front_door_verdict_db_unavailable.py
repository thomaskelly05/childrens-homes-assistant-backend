from __future__ import annotations

import time
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import app as app_module
import db.connection as connection
from db.connection import DatabaseUnavailableError, get_db


@pytest.fixture()
def front_door_client_no_db(monkeypatch):
    connection.db_pool = None
    connection._last_pool_init_failure_at = connection.time.monotonic()
    monkeypatch.setattr(connection, "DB_POOL_INIT_FAILURE_COOLDOWN_SECONDS", 30.0)

    def _raise_unavailable():
        raise DatabaseUnavailableError("Database temporarily unavailable")

    app_module.app.dependency_overrides[get_db] = _raise_unavailable
    client = TestClient(app_module.app)
    yield client
    app_module.app.dependency_overrides.clear()
    connection._last_pool_init_failure_at = None


def test_front_door_verdict_returns_fast_503_when_db_unavailable(front_door_client_no_db):
    start = time.perf_counter()
    response = front_door_client_no_db.get("/orb/front-door/verdict")
    elapsed = time.perf_counter() - start

    assert response.status_code == 503
    assert elapsed < 1.0
    body = response.json()
    assert body["ok"] is False
    assert body["status"] == "service_unavailable"
    assert body["reason"] == "database_unavailable"
    assert "temporarily unavailable" in body["message"].lower()
    assert body["retry_after_seconds"] >= 1
    assert "frankfurt-postgres" not in response.text.lower()
    assert "dpg-" not in response.text.lower()
    assert response.headers.get("retry-after")


def test_front_door_verdict_does_not_grant_access_when_db_unavailable(front_door_client_no_db):
    response = front_door_client_no_db.get("/orb/front-door/verdict")
    body = response.json()
    assert body.get("success") is not True
    assert body.get("data", {}).get("verdict") != "ready"
