from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.os_workflow_wiring_audit_routes import router
from services.platform_operational_integrity_service import platform_operational_integrity_service


def test_platform_integrity_matrix_covers_core_operational_domains():
    audit = platform_operational_integrity_service.audit()
    domains = set(audit["operational_domains"])

    assert audit["ok"] is True
    assert {
        "children",
        "workforce",
        "governance",
        "inspection",
        "safeguarding",
        "chronology",
        "documents",
        "templates",
        "academy",
        "reports",
        "orb",
        "alerts",
        "actions_tasks",
        "provider_oversight",
        "realtime_events",
    } <= domains
    assert audit["integrity_matrix"]["pillars"] == [
        "workflow",
        "chronology",
        "orb",
        "evidence",
        "reports",
        "alerts",
        "dashboard",
    ]
    assert "academy" in audit["integrity_matrix"]["needs_attention"]


def test_platform_integrity_summarises_reference_workflows_and_unfinished_areas():
    audit = platform_operational_integrity_service.audit()

    assert audit["workflow_consistency"]["reference_workflows"]["daily_note"].startswith("Child workflow gold standard")
    assert "chronology_projection" in audit["reporting_consistency"]["must_source"]
    assert "Academy is still legacy-shell only." in audit["hidden_unfinished_areas"]
    assert audit["feature_flags"]["added"] == []


def test_os_wiring_integrity_route_is_database_free():
    app = FastAPI()
    app.include_router(router)

    response = TestClient(app).get("/api/admin/os-wiring/integrity")

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["audit_type"] == "platform_operational_integrity"
    assert "integrity_matrix" in payload

