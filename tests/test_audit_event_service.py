from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from db.connection import DatabaseUnavailableError
from services import audit_event_service as audit


def test_record_audit_event_returns_false_when_database_busy(monkeypatch):
    monkeypatch.setattr(audit, "_TABLE_READY", True)
    monkeypatch.setattr(
        audit,
        "get_db_connection",
        MagicMock(side_effect=DatabaseUnavailableError("Database temporarily unavailable")),
    )
    release = MagicMock()
    monkeypatch.setattr(audit, "release_db_connection", release)

    result = audit.record_audit_event(
        event_type="auth",
        action="login",
        outcome="success",
    )

    assert result is False
    release.assert_not_called()


def test_record_audit_event_returns_true_on_success(monkeypatch):
    monkeypatch.setattr(audit, "_TABLE_READY", True)
    conn = MagicMock()
    conn.closed = False
    cursor = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor
    monkeypatch.setattr(audit, "get_db_connection", MagicMock(return_value=conn))
    release = MagicMock()
    monkeypatch.setattr(audit, "release_db_connection", release)

    result = audit.record_audit_event(
        event_type="auth",
        action="login",
        outcome="success",
    )

    assert result is True
    release.assert_called_once_with(conn)


def test_ensure_audit_table_skips_retry_when_busy(monkeypatch):
    audit._TABLE_READY = False
    audit._TABLE_INIT_ATTEMPTED = False
    monkeypatch.setattr(
        audit,
        "get_db_connection",
        MagicMock(side_effect=DatabaseUnavailableError("busy")),
    )

    assert audit.ensure_audit_table() is False
    assert audit._TABLE_INIT_ATTEMPTED is True
