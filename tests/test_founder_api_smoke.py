"""Smoke tests for founder persistence, telemetry and operating-loop API routes."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app as app_module
from auth.current_user import get_current_user
from middleware.security_middleware import CsrfProtectionMiddleware


@pytest.fixture()
def admin_client(monkeypatch):
    async def _bypass_csrf_dispatch(self, request, call_next):
        return await call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)

    def _ensure_tables(*args, **kwargs):
        return None

    def _list_records(**_kwargs):
        return []

    def _list_audit_log(**_kwargs):
        return []

    def _build_telemetry_summary(**_kwargs):
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

    monkeypatch.setattr(
        "db.founder_persistence_db.ensure_founder_persistence_tables",
        _ensure_tables,
    )
    monkeypatch.setattr("routers.founder_persistence_routes.list_records", _list_records)
    monkeypatch.setattr("routers.founder_persistence_routes.list_audit_log", _list_audit_log)
    monkeypatch.setattr("db.founder_telemetry_db.ensure_founder_telemetry_tables", _ensure_tables)
    monkeypatch.setattr(
        "routers.founder_telemetry_routes.build_telemetry_summary",
        _build_telemetry_summary,
    )

    def admin_user():
        return {"id": 5, "role": "admin", "email": "admin@test.com", "home_id": 1}

    app_module.app.dependency_overrides[get_current_user] = admin_user
    yield TestClient(app_module.app)
    app_module.app.dependency_overrides.clear()


@pytest.fixture()
def staff_client(monkeypatch):
    async def _bypass_csrf_dispatch(self, request, call_next):
        return await call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)

    def staff_user():
        return {"id": 2, "role": "staff", "email": "staff@test.com", "home_id": 1}

    app_module.app.dependency_overrides[get_current_user] = staff_user
    yield TestClient(app_module.app)
    app_module.app.dependency_overrides.clear()


@pytest.mark.parametrize(
    "path",
    [
        "/founder-os/persistence/actions",
        "/founder-os/persistence/approvals",
        "/founder-os/persistence/content",
        "/founder-os/persistence/build-briefs",
        "/founder-os/persistence/quality-runs",
        "/founder-os/persistence/quality-proposals",
        "/founder-os/persistence/expert-reviews",
        "/founder-os/persistence/memories",
        "/founder-os/persistence/operating-loop-runs",
        "/founder-os/persistence/audit-log",
    ],
)
def test_founder_persistence_get_returns_200_for_empty_stores(admin_client, path):
    response = admin_client.get(path)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["count"] == 0
    assert body["data"]["items"] == []


def test_founder_telemetry_summary_returns_200_when_empty(admin_client):
    response = admin_client.get("/founder-os/telemetry/summary?days=30")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["totalEvents"] == 0


def test_founder_persistence_post_does_not_404_for_memories(admin_client, monkeypatch):
    def _create_record(**kwargs):
        record = dict(kwargs["record"])
        record.setdefault("id", "memory-1")
        return record

    def _append_audit_log(**kwargs):
        return {"id": "audit-1", **kwargs}

    monkeypatch.setattr("routers.founder_persistence_routes.create_record", _create_record)
    monkeypatch.setattr("routers.founder_persistence_routes.append_audit_log", _append_audit_log)

    response = admin_client.post(
        "/founder-os/persistence/memories",
        json={
            "record": {
                "status": "active",
                "item": {
                    "id": "memory-1",
                    "type": "principle",
                    "title": "Test",
                    "content": "Safe content",
                    "status": "active",
                    "importance": "normal",
                    "tags": [],
                    "source": "test",
                    "createdAt": "2026-06-09T12:00:00+00:00",
                    "updatedAt": "2026-06-09T12:00:00+00:00",
                    "createdBy": "founder",
                },
            }
        },
    )
    assert response.status_code == 200


def test_founder_persistence_post_does_not_404_for_approvals(admin_client, monkeypatch):
    def _create_record(**kwargs):
        record = dict(kwargs["record"])
        record.setdefault("id", "approval-1")
        return record

    def _append_audit_log(**kwargs):
        return {"id": "audit-1", **kwargs}

    monkeypatch.setattr("routers.founder_persistence_routes.create_record", _create_record)
    monkeypatch.setattr("routers.founder_persistence_routes.append_audit_log", _append_audit_log)

    response = admin_client.post(
        "/founder-os/persistence/approvals",
        json={
            "record": {
                "status": "pending",
                "item": {
                    "id": "approval-1",
                    "type": "linkedin-post",
                    "title": "Weekly update",
                    "content": "Safe founder content.",
                    "requestedByAgent": "brand-ambassador",
                    "riskLevel": "low",
                    "safetyCheck": "Passed",
                    "status": "pending",
                    "createdAt": "2026-06-09T12:00:00+00:00",
                },
            }
        },
    )
    assert response.status_code == 200


@pytest.mark.parametrize(
    "path",
    [
        "/founder-os/persistence/actions",
        "/founder-os/persistence/memories",
        "/founder-os/telemetry/summary",
    ],
)
def test_non_founder_gets_403_not_404(staff_client, path):
    response = staff_client.get(path)
    assert response.status_code == 403


def test_unknown_entity_returns_404(admin_client):
    response = admin_client.get("/founder-os/persistence/not-a-real-entity")
    assert response.status_code == 404


def test_entity_alias_memory_maps_to_memories(admin_client):
    response = admin_client.get("/founder-os/persistence/memory")
    assert response.status_code == 200
    assert response.json()["data"]["items"] == []
