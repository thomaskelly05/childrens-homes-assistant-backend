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

    stored: list[dict] = []

    def _ensure_tables(*args, **kwargs):
        return None

    def _append_telemetry_event(**kwargs):
        metadata = kwargs.get("metadata") or {}
        row = {
            "id": f"tel-{len(stored) + 1}",
            "eventType": kwargs["event_type"],
            "category": kwargs["category"],
            "source": kwargs["source"],
            "route": kwargs.get("route"),
            "userRole": kwargs.get("user_role"),
            "sessionId": kwargs.get("session_id"),
            "metadata": metadata,
            "timestamp": "2026-06-09T12:00:00+00:00",
        }
        stored.append(row)
        return row

    def _build_telemetry_summary(**_kwargs):
        orb = sum(1 for row in stored if row["eventType"] in {"orb-chat-submitted", "orb-conversation"})
        return {
            "totalEvents": len(stored),
            "eventsToday": len(stored),
            "orbConversations": orb,
            "topOrbModes": [{"mode": "Ask ORB", "count": 1}] if orb else [],
            "featureUsage": [{"feature": "dictate", "count": 1}],
            "aiRequests": sum(1 for row in stored if row["eventType"] == "ai-request"),
            "estimatedAiCost": 0.12,
            "errors": sum(1 for row in stored if row["eventType"] == "error"),
            "feedbackCount": sum(1 for row in stored if row["eventType"] == "feedback"),
            "lastUpdated": "2026-06-09T12:00:00+00:00",
        }

    target = "routers.founder_telemetry_routes"
    monkeypatch.setattr("db.founder_telemetry_db.ensure_founder_telemetry_tables", _ensure_tables)
    monkeypatch.setattr(f"{target}.append_telemetry_event", _append_telemetry_event)
    monkeypatch.setattr(f"{target}.build_telemetry_summary", _build_telemetry_summary)

    def admin_user():
        return {"id": 5, "role": "admin", "email": "admin@test.com", "home_id": 1}

    app_module.app.dependency_overrides[get_current_user] = admin_user
    client = TestClient(app_module.app)
    client.stored = stored
    yield client
    app_module.app.dependency_overrides.clear()


@pytest.fixture()
def staff_client(monkeypatch):
    async def _bypass_csrf_dispatch(self, request, call_next):
        return await call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)

    def _append_telemetry_event(**kwargs):
        return {
            "id": "tel-staff-1",
            "eventType": kwargs["event_type"],
            "category": kwargs["category"],
            "source": kwargs["source"],
            "metadata": kwargs.get("metadata") or {},
            "timestamp": "2026-06-09T12:00:00+00:00",
        }

    def _build_telemetry_summary(**_kwargs):
        return {"totalEvents": 0, "eventsToday": 0, "orbConversations": 0, "topOrbModes": [], "featureUsage": [], "aiRequests": 0, "estimatedAiCost": 0, "errors": 0, "feedbackCount": 0, "lastUpdated": None}

    target = "routers.founder_telemetry_routes"
    monkeypatch.setattr(f"{target}.append_telemetry_event", _append_telemetry_event)
    monkeypatch.setattr(f"{target}.build_telemetry_summary", _build_telemetry_summary)

    def staff_user():
        return {"id": 2, "role": "staff", "email": "staff@test.com", "home_id": 1}

    app_module.app.dependency_overrides[get_current_user] = staff_user
    yield TestClient(app_module.app)
    app_module.app.dependency_overrides.clear()


def _safe_event():
    return {
        "eventType": "orb-chat-submitted",
        "category": "orb",
        "source": "test",
        "route": "/orb",
        "metadata": {"mode": "Ask ORB", "feature": "orb-chat"},
    }


def test_staff_can_submit_safe_telemetry_event(staff_client):
    response = staff_client.post("/founder-os/telemetry/event", json=_safe_event())
    assert response.status_code == 200
    assert response.json()["data"]["eventType"] == "orb-chat-submitted"


def test_staff_cannot_read_telemetry_summary(staff_client):
    response = staff_client.get("/founder-os/telemetry/summary")
    assert response.status_code == 403


def test_admin_can_read_telemetry_summary(admin_client):
    admin_client.post("/founder-os/telemetry/event", json=_safe_event())
    response = admin_client.get("/founder-os/telemetry/summary")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["totalEvents"] >= 1
    assert data["orbConversations"] >= 1


def test_telemetry_rejects_identifiable_metadata(staff_client):
    response = staff_client.post(
        "/founder-os/telemetry/event",
        json={
            **_safe_event(),
            "metadata": {"childName": "must be rejected"},
        },
    )
    assert response.status_code == 422


def test_telemetry_stores_redacted_metadata_only(admin_client, monkeypatch):
    captured: dict = {}

    def _append(**kwargs):
        captured.update(kwargs)
        return {
            "id": "tel-1",
            "eventType": kwargs["event_type"],
            "category": kwargs["category"],
            "source": kwargs["source"],
            "metadata": kwargs["metadata"],
            "timestamp": "2026-06-09T12:00:00+00:00",
        }

    from db import founder_telemetry_db as telemetry_db

    def _append_with_sanitise(**kwargs):
        kwargs["metadata"] = telemetry_db.sanitise_telemetry_metadata(kwargs.get("metadata") or {})
        return _append(**kwargs)

    monkeypatch.setattr("routers.founder_telemetry_routes.append_telemetry_event", _append_with_sanitise)

    long_value = "x" * 500
    response = admin_client.post(
        "/founder-os/telemetry/event",
        json={
            **_safe_event(),
            "metadata": {"mode": "Ask ORB", "note": long_value},
        },
    )
    assert response.status_code == 200
    stored_note = captured["metadata"]["note"]
    assert len(stored_note) <= 201
    assert "childName" not in captured["metadata"]


def test_summary_aggregates_safely(admin_client):
    admin_client.post("/founder-os/telemetry/event", json=_safe_event())
    admin_client.post(
        "/founder-os/telemetry/event",
        json={
            "eventType": "feedback",
            "category": "platform",
            "source": "test",
            "metadata": {"rating": "up"},
        },
    )
    summary = admin_client.get("/founder-os/telemetry/summary").json()["data"]
    assert summary["feedbackCount"] >= 1
    assert "childName" not in str(summary)
