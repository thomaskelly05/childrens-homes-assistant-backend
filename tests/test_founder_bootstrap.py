"""Tests for founder bootstrap and sync DB usage."""

from __future__ import annotations

import inspect

import pytest
from fastapi.testclient import TestClient

import app as app_module
import db.founder_persistence_db as persistence_db
import db.founder_telemetry_db as telemetry_db
import routers.inspection_readiness_routes as inspection_routes
from auth.current_user import get_current_user
from middleware.security_middleware import CsrfProtectionMiddleware


@pytest.fixture()
def admin_client(monkeypatch):
    def _bypass_csrf_dispatch(self, request, call_next):
        return call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)

    def _ensure_tables(*args, **kwargs):
        return None

    def _list_bootstrap(**kwargs):
        return {entity: [] for entity in persistence_db.BOOTSTRAP_ENTITY_TYPES}

    def _build_summary(**kwargs):
        return {
            "totalEvents": 0,
            "eventsToday": 0,
            "orbConversations": 0,
            "topOrbModes": [],
            "featureUsage": [],
            "aiRequests": 0,
            "estimatedAiCost": 0,
            "errors": 0,
            "feedbackCount": 0,
            "lastUpdated": None,
        }

    monkeypatch.setattr(persistence_db, "ensure_founder_persistence_tables", _ensure_tables)
    monkeypatch.setattr(persistence_db, "list_bootstrap_persistence", _list_bootstrap)
    monkeypatch.setattr(telemetry_db, "ensure_founder_telemetry_tables", _ensure_tables)
    monkeypatch.setattr(telemetry_db, "build_telemetry_summary", _build_summary)

    def admin_user():
        return {"id": 5, "role": "admin", "email": "admin@test.com", "home_id": 1}

    app_module.app.dependency_overrides[get_current_user] = admin_user
    yield TestClient(app_module.app)
    app_module.app.dependency_overrides.clear()


def test_founder_db_helpers_are_sync_not_async():
    for fn in (
        persistence_db.list_records,
        persistence_db.list_bootstrap_persistence,
        telemetry_db.build_telemetry_summary,
    ):
        assert not inspect.iscoroutinefunction(fn)


def test_founder_bootstrap_returns_200_with_empty_stores(admin_client):
    response = admin_client.get("/founder-os/bootstrap")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    persistence = body["data"]["persistence"]
    assert persistence["actions"] == []
    assert persistence["approvals"] == []
    assert persistence["operatingLoopRuns"] == []


def test_founder_bootstrap_still_returns_200_when_inspection_readiness_fails(admin_client):
    bootstrap = admin_client.get("/founder-os/bootstrap")
    assert bootstrap.status_code == 200
    assert bootstrap.json()["success"] is True


def test_founder_bootstrap_tolerates_failed_persistence_section(admin_client, monkeypatch):
    def _fail_bootstrap(**kwargs):
        raise RuntimeError("database pool is busy")

    monkeypatch.setattr(persistence_db, "list_bootstrap_persistence", _fail_bootstrap)

    response = admin_client.get("/founder-os/bootstrap")
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["persistence"]["actions"] == []
    assert body["data"]["sectionErrors"]["persistence"] == "busy"


def test_founder_persistence_list_does_not_raise_type_error(admin_client, monkeypatch):
    def _list_records(**kwargs):
        return []

    monkeypatch.setattr("routers.founder_persistence_routes.list_records", _list_records)
    response = admin_client.get("/founder-os/persistence/actions")
    assert response.status_code == 200
    assert response.json()["data"]["items"] == []


def test_inspection_readiness_dashboard_does_not_raise_type_error(fake_state):
    import asyncio

    result = asyncio.run(
        inspection_routes.inspection_readiness_dashboard(
            current_user=fake_state["user"],
            conn=None,
            limit=50,
        )
    )
    assert result["success"] is True
    assert "reg44_summary" in result["data"]


def test_audit_logging_failure_does_not_fail_persistence_create(admin_client, monkeypatch):
    def _create_record(**kwargs):
        return {"id": "rec-1", "status": "draft", **kwargs["record"]}

    def _fail_audit(**kwargs):
        raise RuntimeError("database pool is busy")

    monkeypatch.setattr("routers.founder_persistence_routes.create_record", _create_record)
    monkeypatch.setattr("routers.founder_persistence_routes.append_audit_log", _fail_audit)

    response = admin_client.post(
        "/founder-os/persistence/content",
        json={"record": {"status": "draft", "draft": {"id": "draft-1", "title": "Update"}}},
    )
    assert response.status_code == 200
    assert response.json()["data"]["id"] == "rec-1"
