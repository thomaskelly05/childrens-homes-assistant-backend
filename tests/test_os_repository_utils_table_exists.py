from __future__ import annotations

from unittest.mock import MagicMock

import psycopg2

import repositories.os_repository_utils as repo_utils
from repositories.os_repository_utils import table_exists


def _make_conn_with_execute(side_effect):
    conn = MagicMock()
    conn.rollback = MagicMock()

    def cursor_factory(*_args, **_kwargs):
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        cursor.execute.side_effect = side_effect
        return cursor

    conn.cursor.side_effect = cursor_factory
    return conn


def test_table_exists_handles_in_failed_sql_transaction_by_rollback_and_retry():
    repo_utils._TABLE_EXISTS_CACHE.clear()
    attempts = {"n": 0}
    active_cursor: dict[str, MagicMock | None] = {"cursor": None}

    def cursor_factory(*_args, **_kwargs):
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)

        def execute(_sql, _params=None):
            attempts["n"] += 1
            if attempts["n"] == 1:
                raise psycopg2.errors.InFailedSqlTransaction(
                    "current transaction is aborted, commands ignored until end of transaction block"
                )
            cursor.fetchone.return_value = {"exists": True}

        cursor.execute.side_effect = execute
        active_cursor["cursor"] = cursor
        return cursor

    conn = MagicMock()
    conn.rollback = MagicMock()
    conn.cursor.side_effect = cursor_factory

    assert table_exists(conn, "inspection_readiness_packs") is True
    conn.rollback.assert_called_once()


def test_table_exists_returns_false_when_retry_still_fails():
    repo_utils._TABLE_EXISTS_CACHE.clear()

    def execute(_sql, _params=None):
        raise psycopg2.errors.InFailedSqlTransaction("current transaction is aborted")

    conn = _make_conn_with_execute(execute)

    assert table_exists(conn, "inspection_readiness_packs") is False
    assert conn.rollback.call_count >= 1
