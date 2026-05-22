from __future__ import annotations

import inspect
from unittest.mock import MagicMock, patch

import pytest

from db.connection import DatabaseUnavailableError
from routers import governance_intelligence_routes as governance_routes
from services.governance_intelligence_service import GovernanceIntelligenceService


def test_governance_command_centre_route_does_not_depend_on_get_db():
    source = inspect.getsource(governance_routes.governance_command_centre)
    assert "Depends(get_db)" not in source
    assert "get_db" not in source


def test_os_reports_route_uses_scoped_db_connection():
    from backend import os_live_data_router

    source = inspect.getsource(os_live_data_router.os_reports)
    assert "Depends(get_db)" not in source
    assert "db_connection()" in source


def test_get_db_status_reads_pool_bounds_from_env(monkeypatch):
    import db.connection as connection

    monkeypatch.setenv("DB_POOL_MIN", "2")
    monkeypatch.setenv("DB_POOL_MAX", "7")
    monkeypatch.setattr(connection, "DB_POOL_MIN", 2)
    monkeypatch.setattr(connection, "DB_POOL_MAX", 7)

    status = connection.get_db_status()
    pool = status["pool"]
    assert pool["min"] == 2
    assert pool["max"] == 7


def test_build_command_centre_uses_short_lived_db_for_workforce_only():
    service = GovernanceIntelligenceService()
    current_user = {"id": 1, "role": "manager", "home_id": 3, "provider_id": 2}

    with (
        patch.object(service.manager, "build_dashboard", return_value={"ok": True, "summary": {}, "risks": {}}) as manager_build,
        patch.object(service.workspace, "home_workspace", return_value={}) as home_workspace,
        patch.object(service.evidence, "build_home_evidence", return_value={"cards": [], "gaps": []}),
        patch.object(service.provider, "build_dashboard", return_value={"homes": [], "summary": {}}),
        patch.object(service.workforce, "command_centre", return_value={}) as workforce_command,
        patch.object(service.workforce, "orb_context", return_value={}) as workforce_orb,
        patch.object(service, "build_reg44_workflow", return_value={}) as reg44_build,
        patch("services.governance_intelligence_service.db_connection") as db_connection_cm,
    ):
        db_conn = MagicMock(name="db_conn")
        db_connection_cm.return_value.__enter__.return_value = db_conn
        db_connection_cm.return_value.__exit__.return_value = False

        payload = service.build_command_centre(current_user=current_user, days=14, home_id=3)

    manager_build.assert_called_once()
    home_workspace.assert_called_once()
    db_connection_cm.assert_called_once()
    workforce_command.assert_called_once_with(db_conn, current_user=current_user)
    workforce_orb.assert_called_once_with(db_conn, current_user=current_user)
    reg44_build.assert_called_once()
    assert payload["ok"] is True


def test_build_governance_command_centre_returns_stale_snapshot_when_db_busy():
    current_user = {"id": 1, "role": "manager", "home_id": 3}
    stale_payload = {"ok": True, "summary": {"governance_risk": "low"}, "governance_actions": []}
    cached_row = {"stale": True, "payload": stale_payload, "version": 2, "generated_at": "2026-01-01T00:00:00Z"}

    with (
        patch.object(governance_routes.projection_snapshot_service, "get", return_value=cached_row),
        patch.object(
            governance_routes.governance_intelligence_service,
            "build_command_centre",
            side_effect=DatabaseUnavailableError("busy"),
        ),
        patch.object(governance_routes.projection_snapshot_service, "put") as snapshot_put,
    ):
        payload = governance_routes._build_governance_command_centre(
            current_user=current_user,
            days=14,
            home_id=3,
        )

    snapshot_put.assert_not_called()
    assert payload["degraded"] is True
    assert payload["snapshot"]["stale"] is True
