from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import psycopg2
import pytest

import routers.inspection_readiness_routes as routes
from services.inspection_readiness_service import inspection_readiness_service


def test_inspection_readiness_dashboard_does_not_500_when_pack_history_table_check_fails(
    fake_state, monkeypatch
):
    conn = MagicMock()
    conn.rollback = MagicMock()

    def _table_exists_poisoned(_conn, table_name):
        if table_name == "inspection_readiness_packs":
            raise psycopg2.errors.InFailedSqlTransaction("current transaction is aborted")
        return False

    monkeypatch.setattr(
        "services.inspection_readiness_service.table_exists",
        _table_exists_poisoned,
    )

    result = asyncio.run(
        routes.inspection_readiness_dashboard(
            current_user=fake_state["user"],
            conn=conn,
            limit=50,
        )
    )

    assert result["success"] is True
    assert "reg44_summary" in result["data"]
    assert result["data"]["recent_packs"] == []


def test_build_dashboard_returns_degraded_when_pack_generation_fails(fake_state, monkeypatch):
    def _fail_pack(*_args, **_kwargs):
        raise psycopg2.errors.UndefinedTable('relation "recording_drafts" does not exist')

    monkeypatch.setattr(
        inspection_readiness_service,
        "generate_reg44_pack",
        _fail_pack,
    )

    conn = MagicMock()
    conn.rollback = MagicMock()
    dashboard = inspection_readiness_service.build_dashboard(fake_state["user"], conn=conn)

    assert dashboard.metadata.get("degraded") is True
    assert dashboard.recent_packs == []
    conn.rollback.assert_called()
