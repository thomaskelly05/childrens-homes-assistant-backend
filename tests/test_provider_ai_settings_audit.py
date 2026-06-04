from __future__ import annotations

import json

import pytest

from services.provider_data_intelligence_settings_service import (
    provider_data_intelligence_settings_service,
)


def test_write_settings_audit_persists_rows(monkeypatch):
    executed: list[tuple] = []

    class FakeCursor:
        def execute(self, sql, params=None):
            executed.append((sql, params))

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    class FakeConn:
        def cursor(self, cursor_factory=None):
            return FakeCursor()

        def commit(self):
            pass

        def rollback(self):
            pass

        closed = False

    monkeypatch.setattr(
        "services.provider_data_intelligence_settings_service.get_db_connection",
        lambda: FakeConn(),
    )
    monkeypatch.setattr(
        "services.provider_data_intelligence_settings_service.release_db_connection",
        lambda _c: None,
    )

    provider_data_intelligence_settings_service.write_settings_audit(
        provider_id=1,
        home_id=None,
        changed_by=9,
        changes=[("external_ai_enabled", False, True)],
        acknowledgement_flags={"acknowledge_external_ai_processing": True},
        metadata={"source": "test"},
    )
    assert executed
    assert "provider_ai_settings_audit" in executed[0][0]
    assert json.loads(executed[0][1][4]) is False
