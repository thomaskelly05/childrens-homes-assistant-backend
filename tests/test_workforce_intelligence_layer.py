from datetime import datetime, timezone
from pathlib import Path


def test_workforce_intelligence_routes_are_registered():
    import app as app_module

    route_paths = {getattr(route, "path", "") for route in app_module.app.routes}
    assert "/api/workforce-os/intelligence" in route_paths
    assert "/api/workforce-os/chronology" in route_paths
    assert "/api/workforce-os/staff/{staff_id}/chronology" in route_paths
    assert "/api/workforce-os/recording-quality" in route_paths
    assert "/api/workforce-os/risk" in route_paths
    assert "/api/workforce-os/relationships" in route_paths
    assert "/api/workforce-os/command-centre" in route_paths
    assert "/api/workforce-os/orb-context" in route_paths


def test_recording_quality_scoring_detects_practice_markers():
    from services.workforce_intelligence_service import calculate_recording_quality_score

    score = calculate_recording_quality_score(
        {
            "id": 10,
            "staff_id": 5,
            "note_date": "2026-05-18T09:00:00+00:00",
            "created_at": "2026-05-18T12:00:00+00:00",
            "young_person_voice": "The young person said they wanted space before talking.",
            "description": "Staff used PACE, stayed curious and recorded a safeguarding concern.",
            "reflection": "I reflected on what worked and what could be improved next time because relationships matter.",
        },
        now=datetime(2026, 5, 18, tzinfo=timezone.utc),
    )

    assert score["score"] >= 75
    assert score["child_voice_present"] is True
    assert score["safeguarding_language_present"] is True
    assert score["restorative_language_present"] is True
    assert score["reflection_quality"] == "strong"
    assert score["timeliness_hours"] == 3


def test_workforce_risk_scoring_weights_operational_signals():
    from services.workforce_intelligence_service import calculate_workforce_risk_score

    score = calculate_workforce_risk_score(
        {
            "overdue_supervisions": 2,
            "expired_training": 1,
            "missing_training": 1,
            "practice_concerns": 1,
            "wellbeing_flags": 1,
            "incident_count": 2,
        }
    )

    assert score["score"] >= 50
    assert score["level"] in {"high", "critical"}


def test_chronology_aggregation_sorts_and_counts_events():
    from services.workforce_intelligence_service import aggregate_chronology_events

    data = aggregate_chronology_events(
        [
            {"id": "training:1", "event_type": "training", "staff_id": 5, "event_at": "2026-05-10T09:00:00+00:00"},
            {"id": "supervision:1", "event_type": "supervision", "staff_id": 5, "event_at": "2026-05-18T09:00:00+00:00"},
            {"id": "wellbeing:1", "event_type": "wellbeing", "staff_id": 6, "event_at": "2026-05-12T09:00:00+00:00"},
        ]
    )

    assert data["events"][0]["id"] == "supervision:1"
    assert data["summary"]["total"] == 3
    assert data["summary"]["by_type"]["training"] == 1
    assert data["summary"]["by_staff"]["5"] == 2


def test_assistant_retrieval_receives_workforce_evidence_context(monkeypatch):
    from services.assistant_context_service import build_shared_assistant_context
    from services.assistant_retrieval_service import AssistantRetrievalService

    monkeypatch.setattr("services.assistant_retrieval_service.list_chronology", lambda **_kwargs: {"items": []})
    monkeypatch.setattr("services.assistant_retrieval_service.list_evidence", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.assistant_retrieval_service.list_actions", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.assistant_retrieval_service.list_documents", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.assistant_retrieval_service.list_reports", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.assistant_retrieval_service.adult_workspace", lambda *_args, **_kwargs: {})

    class _WorkforceIntelligence:
        def orb_context(self, *_args, **_kwargs):
            return {
                "workforce_summary": {"chronology_events": 3, "home_workforce_health": {"score": 82}},
                "evidence_sources": [
                    {
                        "id": "workforce:1",
                        "source_id": "1",
                        "title": "Supervision culture evidence",
                        "summary": "Reflective supervision and training evidence for inspection.",
                    }
                ],
            }

    monkeypatch.setattr("services.assistant_retrieval_service.WorkforceIntelligenceService", _WorkforceIntelligence)

    context = build_shared_assistant_context(
        current_user={"id": 2, "role": "manager", "home_id": 7, "allowed_home_ids": [7]},
        requested_context={"current_route": "/staff/5/chronology", "selected_staff_id": 5},
        mode="regulatory_readiness",
    )
    result = AssistantRetrievalService().retrieve(
        object(),
        message="Summarise workforce supervision culture evidence",
        context=context,
        current_user={"id": 2, "role": "manager", "home_id": 7, "allowed_home_ids": [7]},
    )

    source_types = {source["source_type"] for source in result.sources}
    assert "workforce_evidence" in source_types
    assert "workforce_intelligence" in source_types


def test_workforce_intelligence_frontend_smoke_contracts():
    root = Path("frontend-next")
    workforce_adapter = (root / "lib/os-api/workforce.ts").read_text()
    staff_page = (root / "app/staff/page.tsx").read_text()
    profile_page = (root / "app/staff/[id]/page.tsx").read_text()
    chronology_page = (root / "app/staff/[id]/chronology/page.tsx").read_text()

    assert "/api/workforce-os/intelligence" in workforce_adapter
    assert "/api/workforce-os/command-centre" in workforce_adapter
    assert "Workforce health" in staff_page
    assert "Evidence-aware staff timeline" in profile_page
    assert "getWorkforceChronology" in chronology_page
