from __future__ import annotations

from unittest.mock import MagicMock

from backend.os_live_validation_router import (
    PERFORMANCE_INDEXES,
    _build_performance_validation,
    _columns,
    _count,
    _index_exists,
    _table_exists,
    _view_exists,
)
from repositories.os_repository_utils import row_bool, row_column_name, row_scalar


def test_row_scalar_dict_cursor() -> None:
    assert row_scalar({"exists": True, "count": 7}, key="count") == 7
    assert row_bool({"exists": True}, key="exists") is True


def test_row_scalar_tuple_cursor() -> None:
    assert row_scalar((False,), index=0) is False
    assert row_column_name(("young_person_id",)) == "young_person_id"


def test_table_exists_dict_cursor() -> None:
    cur = MagicMock()
    cur.fetchone.return_value = {"exists": True}
    assert _table_exists(cur, "daily_notes") is True


def test_table_exists_tuple_cursor() -> None:
    cur = MagicMock()
    cur.fetchone.return_value = (False,)
    assert _table_exists(cur, "daily_notes") is False


def test_index_exists_dict_cursor() -> None:
    cur = MagicMock()
    cur.fetchone.return_value = {"exists": True}
    assert _index_exists(cur, "idx_daily_notes_home_recent") is True


def test_columns_dict_and_tuple_rows() -> None:
    cur = MagicMock()
    cur.fetchall.return_value = [{"column_name": "id"}, ("home_id",)]
    assert _columns(cur, "daily_notes") == {"id", "home_id"}


def test_count_dict_cursor() -> None:
    cur = MagicMock()
    cur.fetchone.side_effect = [{"exists": True}, {"count": 12}]
    assert _count(cur, "daily_notes") == 12


def test_count_tuple_cursor() -> None:
    cur = MagicMock()
    cur.fetchone.side_effect = [(True,), (5,)]
    assert _count(cur, "daily_notes") == 5


def test_performance_validation_survives_index_check_failure(monkeypatch) -> None:
    cur = MagicMock()

    def fake_index_exists(_cur: MagicMock, index_name: str) -> bool:
        if index_name == PERFORMANCE_INDEXES[0]:
            raise RuntimeError("permission denied")
        return True

    monkeypatch.setattr("backend.os_live_validation_router._index_exists", fake_index_exists)
    monkeypatch.setattr(
        "backend.os_live_validation_router._probe_chronology_performance",
        lambda *_args, **_kwargs: {"ok": True, "duration_ms": 120, "slow": False},
    )
    monkeypatch.setattr(
        "backend.os_live_validation_router._probe_care_hub_performance",
        lambda *_args, **_kwargs: {"ok": True, "duration_ms": 180, "slow": False, "cache_hit": False},
    )
    monkeypatch.setattr(
        "backend.os_live_validation_router._probe_operational_feed_performance",
        lambda *_args, **_kwargs: {"ok": True, "duration_ms": 90, "slow": False},
    )
    monkeypatch.setattr(
        "backend.os_live_validation_router._probe_cache_health",
        lambda: {"ok": True, "tracked_entries": 0},
    )
    monkeypatch.setattr(
        "backend.os_live_validation_router._probe_provider_aggregation",
        lambda *_args, **_kwargs: {"ok": True, "duration_ms": 100, "slow": False},
    )

    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cur

    payload = _build_performance_validation({"id": 1, "role": "admin"}, conn)

    assert "validation_errors" in payload
    assert payload["validation_errors"]
    assert payload["indexes"][0]["exists"] is False
    assert payload["missing_indexes"] == [PERFORMANCE_INDEXES[0]]
    assert payload["status"] == "needs_attention"
    assert payload["ok"] is False


def test_performance_validation_returns_required_shape(monkeypatch) -> None:
    monkeypatch.setattr("backend.os_live_validation_router._index_exists", lambda *_a, **_k: True)
    monkeypatch.setattr(
        "backend.os_live_validation_router._probe_chronology_performance",
        lambda *_a, **_k: {"ok": True, "duration_ms": 200, "slow": False},
    )
    monkeypatch.setattr(
        "backend.os_live_validation_router._probe_care_hub_performance",
        lambda *_a, **_k: {"ok": True, "duration_ms": 250, "slow": False},
    )
    monkeypatch.setattr(
        "backend.os_live_validation_router._probe_operational_feed_performance",
        lambda *_a, **_k: {"ok": True, "duration_ms": 120, "slow": False},
    )
    monkeypatch.setattr(
        "backend.os_live_validation_router._probe_cache_health",
        lambda: {"ok": True, "tracked_entries": 2},
    )
    monkeypatch.setattr(
        "backend.os_live_validation_router._probe_provider_aggregation",
        lambda *_a, **_k: {"ok": True, "duration_ms": 150, "slow": False},
    )

    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value = MagicMock()

    payload = _build_performance_validation({"id": 1, "role": "admin"}, conn)

    assert set(["ok", "status", "indexes", "missing_indexes", "validation_errors"]).issubset(payload.keys())
    assert payload["ok"] is True
    assert payload["missing_indexes"] == []


def test_view_exists_tuple_cursor() -> None:
    cur = MagicMock()
    cur.fetchone.return_value = (True,)
    assert _view_exists(cur, "vw_os_chronology_pullthrough") is True
