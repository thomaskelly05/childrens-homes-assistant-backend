from __future__ import annotations

from services.evidence_graph_intelligence_service import evidence_graph_intelligence_service
from services.indicare_intelligence_spine_service import indicare_intelligence_spine_service
from services.ofsted_judgement_simulation_service import ofsted_judgement_simulation_service
from services.pattern_detection_service import pattern_detection_service
from services.record_quality_intelligence_service import record_quality_intelligence_service


def test_pattern_detection_returns_missing_child_voice():
    records = [
        {"id": "dn-1", "record_type": "daily_note", "summary": "Child was settled. Staff supported routine."},
        {"id": "dn-2", "record_type": "daily_note", "notes": "Evening routine completed without child words recorded."},
        {"id": "kw-1", "record_type": "keywork", "description": "Session focused on goals. No direct quotes included."},
    ]
    patterns = pattern_detection_service.detect(records=records, days=30)
    types = {p.pattern_type for p in patterns}
    assert "child_voice_missing" in types


def test_record_quality_flags_punitive_language():
    review = record_quality_intelligence_service.review_record(
        {
            "id": "inc-1",
            "record_type": "incident",
            "summary": "Child was non-compliant and showed challenging behaviour with no context recorded.",
        }
    )
    assert review.therapeutic_language_flags
    assert review.manager_review_required
    assert review.overall_quality in {"weak", "developing"}


def test_ofsted_simulation_does_not_return_a_grade():
    simulation = ofsted_judgement_simulation_service.simulate(
        [
            {"record_type": "daily_note", "summary": "Child said they felt calmer after keywork."},
            {"record_type": "incident", "summary": "Distress incident; staff de-brief completed."},
            {"record_type": "reg44", "title": "Reg 44 visit"},
        ]
    )
    dumped = [s.model_dump() for s in simulation]
    text = str(dumped).lower()
    for banned in ("outstanding", "this is good", "will pass ofsted", "grade:", "judgement: good"):
        assert banned not in text
    assert all("disclaimer" in item for item in dumped)
    assert all(item["evidence_strength"] in {"limited", "emerging", "moderate", "strong"} for item in dumped)


def test_evidence_graph_returns_nodes_and_links():
    graph = evidence_graph_intelligence_service.build(
        [
            {"id": "m-1", "record_type": "missing_episode", "title": "Missing episode"},
            {"id": "rhi-1", "record_type": "return_home_interview", "title": "Return home interview"},
            {"id": "ra-1", "record_type": "risk_assessment", "title": "Risk review"},
        ]
    )
    assert len(graph.nodes) == 3
    assert len(graph.links) >= 1


def test_spine_response_includes_decision_support_notice():
    response = indicare_intelligence_spine_service.build_response(
        __import__("schemas.indicare_intelligence", fromlist=["IntelligenceRequest"]).IntelligenceRequest(
            records=[
                {"id": "dn-1", "record_type": "daily_note", "notes": "Routine evening."},
                {"id": "sg-1", "record_type": "safeguarding_concern", "summary": "Concern raised; review recommended."},
            ]
        )
    )
    assert response.decision_support_notice
    assert "decision support" in response.decision_support_notice.lower()
    assert response.summary.areas_reviewed
