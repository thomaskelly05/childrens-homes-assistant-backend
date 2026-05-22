from __future__ import annotations

from fastapi import FastAPI

from backend.db.schema_doctor import SUPERSEDED_MIGRATIONS
from backend import os_live_validation_router
from core.router_loader import include_routers
from routers import care_hub_routes, operational_feed_routes, orb_routes, os_workflow_wiring_audit_routes
from services.chronology_pattern_service import chronology_pattern_service
from services.home_operational_intelligence_service import home_operational_intelligence_service
from services.operational_alert_engine import operational_alert_engine
from services.operational_risk_matrix_service import operational_risk_matrix_service
from services.orb_operational_reasoning_service import orb_operational_reasoning_service
from services.provider_intelligence_service import ProviderIntelligenceService
from services.workflow_completion_service import workflow_completion_service
from services.inspection_intelligence_service import inspection_intelligence_service
from services.manager_operational_queue_service import manager_operational_queue_service
from services.operational_event_intelligence_service import operational_event_intelligence_service
from services.operational_projection_engine import operational_projection_engine
from services.orb_operational_memory_service import orb_operational_memory_service
from services.therapeutic_language_analysis_service import therapeutic_language_analysis_service


def _paths(router) -> set[str]:
    return {getattr(route, "path", "") for route in router.routes}


def _sample_operational_context() -> dict[str, object]:
    text = "The child said they felt anxious after family contact. Staff reflected on repair work and next time."
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
    queue = manager_operational_queue_service.build_from_events([event])
    inspection = inspection_intelligence_service.analyse(events=[event], manager_queue=queue)
    home = home_operational_intelligence_service.analyse(events=[event], manager_queue=queue, inspection=inspection)
    memory = orb_operational_memory_service.build_memory([event], young_person_id=1001)
    projection = operational_projection_engine.project([event], subject_type="young_person", subject_id="1001").model_dump()
    return {
        "event": event,
        "queue": queue,
        "inspection": inspection,
        "home": home,
        "memory": memory,
        "projection": projection,
    }


def test_schema_doctor_marks_generic_convergence_migration_superseded() -> None:
    assert SUPERSEDED_MIGRATIONS.get("999") == "superseded_operational_postgres_convergence"


def test_realtime_operational_routes_mounted_in_registry() -> None:
    from routers import realtime_operational_routes, platform_observability_routes

    assert "/os/realtime/ws" in _paths(realtime_operational_routes.router)
    assert "/os/realtime/stream" in _paths(realtime_operational_routes.router)
    assert "/os/platform-health" in _paths(platform_observability_routes.router)


def test_orb_router_keeps_voice_realtime_and_api_health_aliases() -> None:
    canonical_paths = _paths(orb_routes.router)
    api_paths = _paths(orb_routes.compat_router)

    assert "/orb/conversation" in canonical_paths
    assert "/orb/session/start" in canonical_paths
    assert "/orb/session/{session_id}/event" in canonical_paths
    assert "/orb/session/{session_id}/interrupt" in canonical_paths
    assert "/orb/session/{session_id}/end" in canonical_paths
    assert "/orb/session/{session_id}/transcript" in canonical_paths
    assert "/orb/session/{session_id}/summary" in canonical_paths
    assert "/orb/realtime/session" in canonical_paths
    assert "/orb/realtime/session/{session_id}/interrupt" in canonical_paths
    assert "/orb/realtime/session/{session_id}/end" in canonical_paths
    assert "/orb/realtime/session/{session_id}/transcript" in canonical_paths
    assert "/orb/realtime/ws" in canonical_paths
    assert "/orb/realtime/health" in canonical_paths
    assert "/orb/provider/status" in canonical_paths
    assert "/orb/events/subscriptions" in canonical_paths
    assert "/orb/health" in canonical_paths

    assert any("/conversation" in path for path in api_paths)
    assert any("/health" in path for path in api_paths)


def test_workflow_wiring_exposes_admin_and_os_command_aliases() -> None:
    admin_paths = _paths(os_workflow_wiring_audit_routes.router)
    compat_paths = _paths(os_workflow_wiring_audit_routes.compat_router)

    assert "/api/admin/os-wiring" in admin_paths
    assert "/api/admin/os-wiring/gold-standard" in admin_paths
    assert "/api/admin/os-wiring/integrity" in admin_paths

    assert any("workflow-wiring-audit" in path for path in compat_paths)
    assert any("health" in path for path in compat_paths)
    assert any("gold-standard" in path for path in compat_paths)
    assert any("integrity" in path for path in compat_paths)


def test_live_os_validation_router_and_alias_are_present() -> None:
    canonical = _paths(os_live_validation_router.router)
    compat = _paths(os_live_validation_router.compat_router)
    assert "/os/validation/live" in canonical
    assert any("live-validation" in path for path in compat)
    assert "/os/validation/workflow-proof" in canonical
    assert any("workflow-proof" in path for path in compat)
    assert "/os/validation/care-hub" in canonical
    assert any("care-hub-validation" in path for path in compat)


def test_operational_feed_routes_are_present() -> None:
    assert "/os/operational-feed" in _paths(operational_feed_routes.router)
    assert "/api/os-command/operational-feed" in _paths(operational_feed_routes.compat_router)


def test_care_hub_routes_are_present() -> None:
    canonical = _paths(care_hub_routes.router)
    compat = _paths(care_hub_routes.compat_router)

    assert "/os/care-hub" in canonical
    assert "/os/care-hub/live" in canonical
    assert "/os/care-hub/alerts" in canonical
    assert "/os/care-hub/inspection" in canonical
    assert "/os/care-hub/workforce" in canonical
    assert "/os/care-hub/safeguarding" in canonical
    assert "/os/care-hub/provider" in canonical
    assert "/os/care-hub/safeguarding-queues" in canonical
    assert "/api/os-command/care-hub" in compat


def test_operational_intelligence_services_generate_expected_signals() -> None:
    text = "The child said they felt anxious after family contact. Staff reflected on repair work and next time."
    analysis = therapeutic_language_analysis_service.analyse(text)
    assert analysis.child_voice_present is True
    assert analysis.reflection_present is True
    assert analysis.rating in {"strong", "developing"}

    ctx = _sample_operational_context()
    event = ctx["event"]

    assert event["orb_visible"] is True
    assert event["child_voice_present"] is True
    assert "anxious" in event["emotional_tags"]
    assert "family" in event["relationship_tags"]

    projection = ctx["projection"]
    assert projection["subject_id"] == "1001"
    assert projection["orb_memory_summary"]

    queue = ctx["queue"]
    assert queue["total"] >= 1

    memory = ctx["memory"]
    assert memory["conversation_summary"]

    inspection = ctx["inspection"]
    assert inspection["overall_readiness"] in {"good", "watching", "requires_immediate_attention"}
    assert inspection["ofsted_challenge_questions"]

    home = ctx["home"]
    assert home["home_climate"]["emotional_climate"]["state"] in {"settled", "mixed", "unsettled"}
    assert "risk_heatmap" in home
    assert "summary" in home


def test_workflow_completion_service_generates_health_metrics() -> None:
    ctx = _sample_operational_context()
    event, queue, inspection = ctx["event"], ctx["queue"], ctx["inspection"]
    workflow = workflow_completion_service.analyse(events=[event], manager_queue=queue, inspection=inspection)
    assert 0 <= workflow["workflow_health_pct"] <= 100
    assert 0 <= workflow["operational_completion_pct"] <= 100
    assert "gaps" in workflow


def test_chronology_pattern_service_supports_orb_questions() -> None:
    event = _sample_operational_context()["event"]
    patterns = chronology_pattern_service.analyse([event])
    assert "orb_questions" in patterns
    assert "patterns_before_incidents" in patterns["orb_questions"]
    assert "patterns_before_missing" in patterns["orb_questions"]
    assert "interventions_reduce_dysregulation" in patterns["orb_questions"]


def test_operational_risk_matrix_and_alerts_converge_from_feed() -> None:
    ctx = _sample_operational_context()
    event, queue, inspection, home = ctx["event"], ctx["queue"], ctx["inspection"], ctx["home"]
    feed = {
        "events": [event],
        "manager_queue": queue,
        "inspection_intelligence": inspection,
        "home_operational_intelligence": home,
    }
    workflow = workflow_completion_service.analyse(events=[event], manager_queue=queue, inspection=inspection)
    patterns = chronology_pattern_service.analyse([event])
    risk = operational_risk_matrix_service.build(feed=feed, workflow=workflow, chronology_patterns=patterns)
    alerts = operational_alert_engine.generate(feed=feed, workflow=workflow, risk_matrix=risk, chronology_patterns=patterns)

    assert "live_operational_risk_score" in risk
    assert "dimensions" in risk
    assert alerts["total"] >= 0
    assert "child_voice_quality" in risk["dimensions"]


def test_orb_operational_reasoning_answers_pattern_questions() -> None:
    ctx = _sample_operational_context()
    event, queue, inspection, home, memory = (
        ctx["event"],
        ctx["queue"],
        ctx["inspection"],
        ctx["home"],
        ctx["memory"],
    )
    feed = {
        "events": [event],
        "manager_queue": queue,
        "inspection_intelligence": inspection,
        "home_operational_intelligence": home,
        "orb_operational_memory": memory,
    }
    patterns = chronology_pattern_service.analyse([event])
    reasoning = orb_operational_reasoning_service.reason(
        feed=feed,
        chronology_patterns=patterns,
        question="What patterns exist before incidents?",
    )
    assert reasoning["operational_summary"]
    assert reasoning["inspection_summary"]
    assert reasoning["answer"]


def test_provider_operational_convergence_builds_cross_home_view() -> None:
    provider = ProviderIntelligenceService()
    result = provider.build_operational_convergence(
        conn=None,
        current_user={"provider_id": 1, "role": "provider_admin"},
        limit=10,
    )
    assert result["ok"] is True
    assert "cross_home_safeguarding_pressure" in result
    assert "operational_escalation_score" in result


def test_care_hub_intelligence_payload_shape_without_db() -> None:
    ctx = _sample_operational_context()
    event, queue, inspection, home, memory, projection = (
        ctx["event"],
        ctx["queue"],
        ctx["inspection"],
        ctx["home"],
        ctx["memory"],
        ctx["projection"],
    )
    feed = {
        "ok": True,
        "event_count": 1,
        "events": [event],
        "manager_queue": queue,
        "inspection_intelligence": inspection,
        "home_operational_intelligence": home,
        "orb_operational_memory": memory,
        "projection": projection,
    }
    workflow = workflow_completion_service.analyse(events=[event], manager_queue=queue, inspection=inspection)
    patterns = chronology_pattern_service.analyse([event])
    risk = operational_risk_matrix_service.build(feed=feed, workflow=workflow, chronology_patterns=patterns)
    alerts = operational_alert_engine.generate(feed=feed, workflow=workflow, risk_matrix=risk, chronology_patterns=patterns)

    assert workflow["workflow_health_pct"] >= 0
    assert risk["matrix_state"] in {"critical", "heightened", "stable"}
    assert "alerts" in alerts


def test_missing_optional_routers_do_not_fail_startup() -> None:
    app = FastAPI()
    report = include_routers(app)

    assert "routers.auth_routes" in report.loaded
    assert "routers.orb_routes" in report.loaded
    assert "routers.os_workflow_wiring_audit_routes" in report.loaded
    assert "routers.operational_feed_routes" in report.loaded
    assert "routers.care_hub_routes" in report.loaded
    assert "backend.os_live_validation_router" in report.loaded
    assert all(router != "routers.auth_routes" for router, _reason in report.skipped_optional)
