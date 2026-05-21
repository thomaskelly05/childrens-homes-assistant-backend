from __future__ import annotations

from fastapi import FastAPI

from backend.db.schema_doctor import SUPERSEDED_MIGRATIONS
from backend import os_live_validation_router
from core.router_loader import include_routers
from routers import operational_feed_routes, orb_routes, os_workflow_wiring_audit_routes
from services.home_operational_intelligence_service import home_operational_intelligence_service
from services.inspection_intelligence_service import inspection_intelligence_service
from services.manager_operational_queue_service import manager_operational_queue_service
from services.operational_event_intelligence_service import operational_event_intelligence_service
from services.operational_projection_engine import operational_projection_engine
from services.orb_operational_memory_service import orb_operational_memory_service
from services.therapeutic_language_analysis_service import therapeutic_language_analysis_service


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
    assert "/workflow-proof" in _paths(os_live_validation_router.router)
    assert "/workflow-proof" in _paths(os_live_validation_router.compat_router)


def test_operational_feed_routes_are_present() -> None:
    assert "" in _paths(operational_feed_routes.router)
    assert "/operational-feed" in _paths(operational_feed_routes.compat_router)


def test_operational_intelligence_services_generate_expected_signals() -> None:
    text = "The child said they felt anxious after family contact. Staff reflected on repair work and next time."
    analysis = therapeutic_language_analysis_service.analyse(text)
    assert analysis.child_voice_present is True
    assert analysis.reflection_present is True
    assert analysis.rating in {"strong", "developing"}

    event = operational_event_intelligence_service.build_event(
        source_table="daily_notes",
        record={
            "id": 1,
            "young_person_id": 1001,
            "staff_id": 7,
            "home_id": 3,
            "provider_id": 2,
            "presentation": text,
            "young_person_voice": "The child said they felt anxious.",
            "workflow_status": "submitted",
            "evidence_count": 0,
        },
    ).model_dump()

    assert event["orb_visible"] is True
    assert event["child_voice_present"] is True
    assert "anxious" in event["emotional_tags"]
    assert "family" in event["relationship_tags"]

    projection = operational_projection_engine.project([event], subject_type="young_person", subject_id="1001").model_dump()
    assert projection["subject_id"] == "1001"
    assert projection["orb_memory_summary"]

    queue = manager_operational_queue_service.build_from_events([event])
    assert queue["total"] >= 1

    memory = orb_operational_memory_service.build_memory([event], young_person_id=1001)
    assert memory["conversation_summary"]

    inspection = inspection_intelligence_service.analyse(events=[event], manager_queue=queue)
    assert inspection["overall_readiness"] in {"good", "watching", "requires_immediate_attention"}
    assert inspection["ofsted_challenge_questions"]

    home = home_operational_intelligence_service.analyse(
        events=[event],
        manager_queue=queue,
        inspection=inspection,
    )
    assert home["home_climate"]["emotional_climate"]["state"] in {"settled", "mixed", "unsettled"}
    assert "risk_heatmap" in home
    assert "summary" in home


def test_missing_optional_routers_do_not_fail_startup() -> None:
    app = FastAPI()
    report = include_routers(app)

    assert "routers.auth_routes" in report.loaded
    assert "routers.orb_routes" in report.loaded
    assert "routers.os_workflow_wiring_audit_routes" in report.loaded
    assert "routers.operational_feed_routes" in report.loaded
    assert "backend.os_live_validation_router" in report.loaded
    assert all(router != "routers.auth_routes" for router, _reason in report.skipped_optional)
