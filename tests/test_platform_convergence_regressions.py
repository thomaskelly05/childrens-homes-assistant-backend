from __future__ import annotations

from fastapi import FastAPI

from backend.db.schema_doctor import SUPERSEDED_MIGRATIONS
from backend import os_live_validation_router
from core.router_loader import include_routers
from routers import orb_routes, os_workflow_wiring_audit_routes


def _paths(router) -> set[str]:
    return {getattr(route, "path", "") for route in router.routes}


def test_schema_doctor_marks_generic_convergence_migration_superseded() -> None:
    assert SUPERSEDED_MIGRATIONS.get("999") == "superseded_operational_postgres_convergence"


def test_orb_router_keeps_voice_realtime_and_api_health_aliases() -> None:
    canonical_paths = _paths(orb_routes.router)
    api_paths = _paths(orb_routes.compat_router)

    assert "/conversation" in canonical_paths
    assert "/session/start" in canonical_paths
    assert "/session/{session_id}/event" in canonical_paths
    assert "/session/{session_id}/interrupt" in canonical_paths
    assert "/session/{session_id}/end" in canonical_paths
    assert "/session/{session_id}/transcript" in canonical_paths
    assert "/session/{session_id}/summary" in canonical_paths
    assert "/realtime/session" in canonical_paths
    assert "/realtime/session/{session_id}/interrupt" in canonical_paths
    assert "/realtime/session/{session_id}/end" in canonical_paths
    assert "/realtime/session/{session_id}/transcript" in canonical_paths
    assert "/realtime/ws" in canonical_paths
    assert "/realtime/health" in canonical_paths
    assert "/provider/status" in canonical_paths
    assert "/events/subscriptions" in canonical_paths
    assert "/health" in canonical_paths

    assert "/conversation" in api_paths
    assert "/health" in api_paths


def test_workflow_wiring_exposes_admin_and_os_command_aliases() -> None:
    admin_paths = _paths(os_workflow_wiring_audit_routes.router)
    compat_paths = _paths(os_workflow_wiring_audit_routes.compat_router)

    assert "" in admin_paths
    assert "/health" in admin_paths
    assert "/gold-standard" in admin_paths
    assert "/integrity" in admin_paths

    assert "/workflow-wiring-audit" in compat_paths
    assert "/workflow-wiring-audit/health" in compat_paths
    assert "/workflow-wiring-audit/gold-standard" in compat_paths
    assert "/workflow-wiring-audit/integrity" in compat_paths


def test_live_os_validation_router_and_alias_are_present() -> None:
    assert "/live" in _paths(os_live_validation_router.router)
    assert "/live-validation" in _paths(os_live_validation_router.compat_router)


def test_missing_optional_routers_do_not_fail_startup() -> None:
    app = FastAPI()
    report = include_routers(app)

    assert "routers.auth_routes" in report.loaded
    assert "routers.orb_routes" in report.loaded
    assert "routers.os_workflow_wiring_audit_routes" in report.loaded
    assert "backend.os_live_validation_router" in report.loaded
    assert all(router != "routers.auth_routes" for router, _reason in report.skipped_optional)
