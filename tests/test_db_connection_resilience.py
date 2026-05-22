from __future__ import annotations

import os
import time
from unittest.mock import MagicMock, patch

import pytest

import db.connection as connection


@pytest.fixture(autouse=True)
def reset_db_connection_state(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")
    connection.DATABASE_URL = os.environ["DATABASE_URL"]
    connection.db_pool = None
    connection._last_db_error = None
    connection._last_checked_at = None
    connection.DB_REQUIRED_ON_STARTUP = False
    yield
    connection.close_db_pool()


def test_init_db_pool_continues_when_not_required(monkeypatch):
    monkeypatch.setattr(connection, "DB_REQUIRED_ON_STARTUP", False)

    with patch.object(connection, "ThreadedConnectionPool", side_effect=connection.OperationalError("timeout expired")):
        result = connection.init_db_pool(max_retries=1)

    assert result is None
    assert connection.db_pool is None
    assert connection.get_db_status()["available"] is False
    assert connection.get_db_status()["last_error"]
    assert "timeout" in (connection.get_db_status()["last_error"] or "")


def test_init_db_pool_raises_when_required(monkeypatch):
    monkeypatch.setattr(connection, "DB_REQUIRED_ON_STARTUP", True)

    with patch.object(connection, "ThreadedConnectionPool", side_effect=connection.OperationalError("timeout expired")):
        with pytest.raises(connection.OperationalError):
            connection.init_db_pool(max_retries=1)


def test_get_db_status_after_failure():
    connection._touch_db_status(error=connection.OperationalError("connection failed"))
    status = connection.get_db_status()

    assert status["available"] is False
    assert status["pool_initialised"] is False
    assert status["last_error"] == "connection failed"
    assert status["last_checked_at"]


def test_get_db_connection_raises_database_unavailable():
    with patch.object(connection, "init_db_pool", return_value=None):
        with pytest.raises(connection.DatabaseUnavailableError):
            connection.get_db_connection()


def test_get_db_connection_maps_operational_error_to_unavailable():
    mock_pool = MagicMock()
    mock_pool.getconn.side_effect = connection.OperationalError("server closed")

    connection.db_pool = mock_pool
    connection._db_pool_slots = MagicMock()
    connection._db_pool_slots.acquire.return_value = True

    with pytest.raises(connection.DatabaseUnavailableError):
        connection.get_db_connection()


def test_get_db_status_exposes_pool_pressure(monkeypatch):
    max_conn = connection.DB_POOL_MAX
    used = {index: object() for index in range(max_conn)}
    monkeypatch.setattr(connection, "db_pool", MagicMock(_used=used, _pool=[]))
    status = connection.get_db_status()
    pool = status["pool"]
    assert pool["used"] == max_conn
    assert pool["max"] == max_conn
    assert "acquisition_failures" in pool
    assert status["pool_pressure"] is True


def test_get_db_connection_fails_quickly_when_pool_slot_unavailable(monkeypatch):
    monkeypatch.setattr(connection, "DB_POOL_WAIT_TIMEOUT_SECONDS", 0.05)
    monkeypatch.setattr(connection, "DB_POOL_ACQUIRE_RETRIES", 1)
    connection.db_pool = MagicMock()
    connection._db_pool_slots = MagicMock()
    connection._db_pool_slots.acquire.return_value = False

    start = time.perf_counter()
    with pytest.raises(connection.DatabaseUnavailableError):
        connection.get_db_connection()
    elapsed = time.perf_counter() - start

    assert elapsed < 1.0
    connection._db_pool_slots.acquire.assert_called_once()


def test_db_connection_context_manager_releases_connection(monkeypatch):
    mock_conn = MagicMock()
    mock_conn.closed = False
    release = MagicMock()
    monkeypatch.setattr(connection, "get_db_connection", MagicMock(return_value=mock_conn))
    monkeypatch.setattr(connection, "release_db_connection", release)

    with connection.db_connection() as conn:
        assert conn is mock_conn

    release.assert_called_once_with(mock_conn)
