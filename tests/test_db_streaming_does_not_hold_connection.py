from __future__ import annotations

from unittest.mock import MagicMock

from psycopg2 import OperationalError

from db.connection import _safe_db_finalize


def test_safe_db_finalize_swallows_closed_connection_on_commit():
    conn = MagicMock()
    conn.closed = False
    conn.commit.side_effect = OperationalError("SSL connection has been closed unexpectedly")
    _safe_db_finalize(conn, commit=True)
    conn.rollback.assert_not_called()


def test_safe_db_finalize_skips_closed_connection():
    conn = MagicMock()
    conn.closed = True
    _safe_db_finalize(conn, commit=True)
    conn.commit.assert_not_called()
