from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

import pytest

import routers.orb_saved_output_routes as standalone_routes
from schemas.orb_saved_outputs import OrbSavedOutputCreate, OrbSavedOutputListRequest
from services.orb_saved_output_service import (
    SCHEMA_DEGRADED_REASON,
    SavedOutputSchemaMigrationRequired,
    orb_saved_output_service,
)
from services.orb_schema_verification import (
    MIGRATION_207_PATH,
    saved_outputs_schema_state,
    verify_saved_outputs_schema,
)


@pytest.fixture(autouse=True)
def reset_service_state(monkeypatch):
    svc = orb_saved_output_service
    svc._memory = {}
    svc._storage_mode = "memory"
    svc._schema_state = None
    monkeypatch.setattr(svc, "_use_db", lambda: True)


def _legacy_missing_status_state():
    return {
        "exists": True,
        "canonical": False,
        "missing_columns": ["status"],
        "has_user_id": True,
        "has_status": False,
        "user_scoped": True,
        "migration_required": True,
    }


def _unsafe_no_user_id_state():
    return {
        "exists": True,
        "canonical": False,
        "missing_columns": ["user_id", "status"],
        "has_user_id": False,
        "has_status": False,
        "user_scoped": False,
        "migration_required": True,
    }


def test_migration_adds_status_in_075_branch():
    text = Path("sql/207_orb_saved_outputs_canonical.sql").read_text(encoding="utf-8")
    assert "ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'saved'" in text
    assert "075_rich" in text or "Rich 075" in text


def test_migration_status_backfill_for_archived():
    migration = Path("sql/207_orb_saved_outputs_canonical.sql").read_text(encoding="utf-8")
    assert "status = 'archived'" in migration
    assert "archived_at IS NOT NULL" in migration


def test_verify_schema_reports_migration_required(monkeypatch):
    monkeypatch.setattr(
        "services.orb_schema_verification._table_columns",
        lambda _name: {"id", "user_id", "title", "type"},
    )
    result = verify_saved_outputs_schema()
    assert result["status"] == "fail"
    assert result["migration_required"] is True
    assert "status" in result["missing_columns"]
    assert result["migration"] == MIGRATION_207_PATH


def test_summary_degraded_when_status_missing(monkeypatch):
    svc = orb_saved_output_service
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "postgresql")
    monkeypatch.setattr(svc, "_saved_outputs_schema_state", _legacy_missing_status_state)
    monkeypatch.setattr(
        svc,
        "_list_db",
        lambda uid, req: (
            [
                {
                    "id": "out-1",
                    "user_id": uid,
                    "title": "Legacy row",
                    "type": "general_research",
                    "created_at": "2026-01-01T00:00:00+00:00",
                }
            ],
            1,
        ),
    )

    summary = svc.get_summary(42)
    assert summary["total"] == 1
    assert summary.get("degraded") is True
    assert summary["reason"] == SCHEMA_DEGRADED_REASON


def test_summary_empty_when_user_id_missing(monkeypatch):
    svc = orb_saved_output_service
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "postgresql")
    monkeypatch.setattr(svc, "_saved_outputs_schema_state", _unsafe_no_user_id_state)

    summary = svc.get_summary(7)
    assert summary["total"] == 0
    assert summary["degraded"] is True
    assert summary["reason"] == SCHEMA_DEGRADED_REASON


def test_list_db_omits_status_filter_when_column_missing(monkeypatch):
    svc = orb_saved_output_service
    monkeypatch.setattr(svc, "_db_read_allowed", lambda: True)
    monkeypatch.setattr(svc, "_saved_outputs_schema_state", _legacy_missing_status_state)

    queries: list[str] = []

    class FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, sql, params=None):
            queries.append(sql)

        def fetchone(self):
            return {"c": 0}

        def fetchall(self):
            return []

    class FakeConn:
        def cursor(self, cursor_factory=None):
            return FakeCursor()

        def commit(self):
            pass

    monkeypatch.setattr(
        "services.orb_saved_output_service.get_db_connection", lambda: FakeConn()
    )
    monkeypatch.setattr(
        "services.orb_saved_output_service.release_db_connection", lambda _c: None
    )

    _rows, total = svc._list_db(5, OrbSavedOutputListRequest())
    assert total == 0
    combined = " ".join(queries)
    assert "status" not in combined.lower()


def test_unsafe_table_not_queried(monkeypatch):
    svc = orb_saved_output_service
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "postgresql")
    monkeypatch.setattr(svc, "_saved_outputs_schema_state", _unsafe_no_user_id_state)

    called = {"list_db": False}

    def _fail_list(*_a, **_k):
        called["list_db"] = True
        return [], 0

    monkeypatch.setattr(svc, "_list_db", _fail_list)
    result = svc.list_outputs(99, OrbSavedOutputListRequest())
    assert result.total == 0
    assert called["list_db"] is False


def test_create_succeeds_with_adaptive_insert_when_status_missing(monkeypatch):
    svc = orb_saved_output_service
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "postgresql")
    monkeypatch.setattr(svc, "_saved_outputs_schema_state", _legacy_missing_status_state)
    captured: dict[str, Any] = {}

    def _capture(row):
        captured.update(row)

    monkeypatch.setattr(svc, "_insert_db_adaptive", _capture)

    record = svc.create_output(
        42,
        OrbSavedOutputCreate(
            title="Adaptive save",
            type="general_research",
            metadata={"review_status": "needs_review"},
        ),
    )
    assert record.title == "Adaptive save"
    assert record.metadata.get("review_status") == "needs_review"
    assert captured["title"] == "Adaptive save"
    assert captured["user_id"] == 42


def test_create_route_succeeds_when_adaptive_insert_available(monkeypatch):
    svc = orb_saved_output_service
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "postgresql")
    monkeypatch.setattr(svc, "_saved_outputs_schema_state", _legacy_missing_status_state)
    monkeypatch.setattr(svc, "_insert_db_adaptive", lambda row: None)

    resp = asyncio.run(
        standalone_routes.create_output(
            OrbSavedOutputCreate(title="Route save", type="general_research"),
            current_user={"user_id": 7, "id": 7},
        )
    )
    assert resp["success"] is True
    assert resp["data"]["title"] == "Route save"


def test_write_raises_when_required_columns_missing(monkeypatch):
    svc = orb_saved_output_service
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "postgresql")
    monkeypatch.setattr(svc, "_saved_outputs_schema_state", _unsafe_no_user_id_state)

    with pytest.raises(SavedOutputSchemaMigrationRequired):
        svc.create_output(1, OrbSavedOutputCreate(title="Blocked", type="general_research"))


def test_summary_route_does_not_500_on_schema_drift(monkeypatch):
    svc = orb_saved_output_service

    def _boom(_uid, _req):
        raise RuntimeError("db")

    monkeypatch.setattr(svc, "list_outputs", _boom)
    resp = asyncio.run(
        standalone_routes.outputs_summary(current_user={"user_id": 1, "id": 1})
    )
    assert resp["success"] is True
    assert resp["data"]["degraded"] is True
    assert resp["data"]["reason"] == SCHEMA_DEGRADED_REASON


def test_saved_outputs_schema_state_shape(monkeypatch):
    monkeypatch.setattr(
        "services.orb_schema_verification._table_columns",
        lambda _name: None,
    )
    state = saved_outputs_schema_state()
    assert state["exists"] is False
    assert state["canonical"] is False
