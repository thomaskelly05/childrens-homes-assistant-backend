from __future__ import annotations

from unittest.mock import MagicMock

from services.operational_feed_service import latest_records, table_columns, table_exists


def test_table_exists_supports_dict_cursor_row() -> None:
    cur = MagicMock()
    cur.fetchone.return_value = {"exists": True}

    assert table_exists(cur, "daily_notes") is True
    cur.execute.assert_called_once()


def test_table_exists_supports_tuple_cursor_row() -> None:
    cur = MagicMock()
    cur.fetchone.return_value = (False,)

    assert table_exists(cur, "daily_notes") is False


def test_table_columns_supports_dict_cursor_rows() -> None:
    cur = MagicMock()
    cur.fetchall.return_value = [{"column_name": "id"}, {"column_name": "home_id"}]

    assert table_columns(cur, "daily_notes") == {"id", "home_id"}


def test_table_columns_supports_tuple_cursor_rows() -> None:
    cur = MagicMock()
    cur.fetchall.return_value = [("id",), ("home_id",)]

    assert table_columns(cur, "daily_notes") == {"id", "home_id"}


def test_latest_records_supports_dict_cursor_rows(monkeypatch) -> None:
    cur = MagicMock()
    cur.fetchall.return_value = [{"id": 1, "home_id": 2}]
    monkeypatch.setattr(
        "services.operational_feed_service.table_exists",
        lambda _cur, _table: True,
    )
    monkeypatch.setattr(
        "services.operational_feed_service.table_columns",
        lambda _cur, _table: {"id", "home_id", "updated_at"},
    )

    records = latest_records(cur, "daily_notes", limit=5)

    assert records == [{"id": 1, "home_id": 2}]


def test_latest_records_supports_tuple_cursor_rows(monkeypatch) -> None:
    cur = MagicMock()
    cur.fetchall.return_value = [(1, 2)]
    cur.description = [("id",), ("home_id",)]
    monkeypatch.setattr(
        "services.operational_feed_service.table_exists",
        lambda _cur, _table: True,
    )
    monkeypatch.setattr(
        "services.operational_feed_service.table_columns",
        lambda _cur, _table: {"id", "home_id", "updated_at"},
    )

    records = latest_records(cur, "daily_notes", limit=5)

    assert records == [{"id": 1, "home_id": 2}]
