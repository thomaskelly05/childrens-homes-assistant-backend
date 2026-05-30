from __future__ import annotations

from unittest.mock import MagicMock

import psycopg2
import pytest
from fastapi import HTTPException

from auth.orb_standalone_premium_dependency import require_rich_orb_premium_access
from db import orb_residential_db
from services.orb_access_service import orb_access_service


def test_get_orb_user_preferences_rolls_back_on_missing_table():
    conn = MagicMock()
    conn.rollback = MagicMock()
    cursor = MagicMock()
    cursor.__enter__ = MagicMock(return_value=cursor)
    cursor.__exit__ = MagicMock(return_value=False)
    cursor.execute.side_effect = psycopg2.errors.UndefinedTable(
        'relation "orb_user_preferences" does not exist'
    )
    conn.cursor.return_value = cursor

    result = orb_residential_db.get_orb_user_preferences(conn, 42)

    assert result is None
    conn.rollback.assert_called_once()


def test_get_orb_access_state_continues_after_preferences_table_missing(monkeypatch):
    conn = MagicMock()
    conn.rollback = MagicMock()
    trial_lookup_called = {"n": 0}

    monkeypatch.setattr(orb_residential_db, "get_orb_subscription", lambda *_a, **_k: {})
    monkeypatch.setattr(orb_residential_db, "has_orb_safety_acceptance", lambda *_a, **_k: True)

    def _user_has_used_orb_trial(_conn, _uid):
        trial_lookup_called["n"] += 1
        return False

    monkeypatch.setattr(orb_residential_db, "user_has_used_orb_trial", _user_has_used_orb_trial)

    def cursor_factory(*args, **kwargs):
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)

        def execute(sql, params=None):
            if "orb_user_preferences" in sql:
                raise psycopg2.errors.UndefinedTable('relation "orb_user_preferences" does not exist')
            if "orb_trials" in sql:
                cursor.fetchone.return_value = None
                return None
            cursor.fetchone.return_value = None

        cursor.execute.side_effect = execute
        return cursor

    conn.cursor.side_effect = cursor_factory

    state = orb_residential_db.get_orb_access_state(conn, 42, user={"id": 42, "role": "staff"})

    assert trial_lookup_called["n"] == 1
    assert conn.rollback.called
    assert state["can_use_orb"] is False


def test_require_rich_orb_premium_access_returns_503_on_db_failure(monkeypatch):
    conn = MagicMock()
    conn.rollback = MagicMock()

    def _raise(_conn, user_id, workflow="ask_orb"):
        raise RuntimeError("simulated access query failure")

    monkeypatch.setattr(
        "auth.orb_standalone_premium_dependency.orb_access_service.check_access",
        _raise,
    )

    with pytest.raises(HTTPException) as exc:
        require_rich_orb_premium_access(conn=conn, current_user={"user_id": 5, "id": 5})

    assert exc.value.status_code == 503
    assert exc.value.detail["error"] == "access_check_unavailable"
    assert exc.value.detail["os_access_granted"] is False
    conn.rollback.assert_called_once()


def test_require_rich_orb_premium_access_denies_when_access_state_has_db_error(monkeypatch):
    conn = MagicMock()

    monkeypatch.setattr(
        "auth.orb_standalone_premium_dependency.orb_access_service.check_access",
        lambda _conn, user_id, workflow="ask_orb": MagicMock(
            allowed=False,
            access_state={"safety_accepted": True, "can_use_orb": False, "db_error": "access_state_unavailable"},
            reason="premium_subscription_required",
        ),
    )

    with pytest.raises(HTTPException) as exc:
        require_rich_orb_premium_access(conn=conn, current_user={"user_id": 5, "id": 5})

    assert exc.value.status_code == 503
    assert exc.value.detail["os_access_granted"] is False


def test_build_access_payload_never_grants_access_on_db_failure(monkeypatch):
    conn = MagicMock()
    conn.rollback = MagicMock()

    def _boom(*_a, **_k):
        raise psycopg2.errors.InFailedSqlTransaction("current transaction is aborted")

    monkeypatch.setattr("services.orb_access_service.get_orb_access_state", _boom)

    payload = orb_access_service.build_access_payload(9, conn=conn, user={"id": 9})
    assert payload["can_use_orb"] is False
    assert payload["db_error"] == "access_state_unavailable"
    conn.rollback.assert_called()
