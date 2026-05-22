from __future__ import annotations

import os
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
