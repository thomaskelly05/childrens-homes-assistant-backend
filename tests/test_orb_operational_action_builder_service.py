from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from schemas.orb_operational import OrbOperationalDraftAction, OrbOperationalRecommendation, OrbOperationalRequest
from services.orb_operational_action_builder_service import orb_operational_action_builder_service


def test_build_recommendations_from_context():
    context = {
        "summary": {
            "attention_items": ["Review open action"],
            "safeguarding_signals": ["Repeated missing episodes"],
            "record_quality_notes": ["Record 1: review may be helpful"],
        },
        "sources": [{"label": "Manager daily brief", "source_type": "brief", "basis": "Summary"}],
    }
    request = OrbOperationalRequest(message="What needs attention?", mode="manager_daily_brief")
    recs = orb_operational_action_builder_service.build_recommendations(context, "answer", request)
    assert recs
    assert any(r.review_required for r in recs)


def test_high_severity_recommendations_require_review():
    rec = OrbOperationalRecommendation(
        id="r1",
        title="Safeguarding",
        summary="Theme",
        priority="urgent",
        review_required=True,
        manager_review_reason="Not a threshold decision",
    )
    drafts = orb_operational_action_builder_service.build_draft_actions([rec], OrbOperationalRequest(message="draft action", mode="action_priority"))
    assert drafts
    assert drafts[0].review_required is True
    assert drafts[0].standalone_only is False
    assert drafts[0].os_linked is True


def test_draft_actions_for_action_prompt():
    context = {"summary": {"attention_items": []}, "sources": []}
    request = OrbOperationalRequest(message="What actions should I prioritise?", mode="action_priority")
    enriched = orb_operational_action_builder_service.enrich_response_fields(
        context=context,
        answer="Prioritise safeguarding follow-up.",
        request=request,
        audit_reference="audit-test",
        current_user={"role": "manager"},
    )
    assert enriched["draft_actions"]
    assert enriched["recommendations"]


def test_no_auto_persist_on_enrich():
    context = {"summary": {}, "sources": []}
    request = OrbOperationalRequest(message="hello", mode="general_operational_question")
    enriched = orb_operational_action_builder_service.enrich_response_fields(
        context=context,
        answer="General guidance",
        request=request,
        audit_reference=None,
    )
    assert "draft_actions" in enriched
    assert enriched.get("briefing") is None or isinstance(enriched["briefing"], dict)


def test_create_actions_from_drafts(monkeypatch):
    created = []

    class FakeRecord:
        id = "action-1"

    def fake_create(payload, **kwargs):
        _ = kwargs
        created.append(payload.title)
        return FakeRecord()

    import services.intelligence_action_service as ias

    monkeypatch.setattr(ias.intelligence_action_service, "create_action", fake_create)
    monkeypatch.setattr(ias.intelligence_action_service, "persistence_available", lambda: True)

    drafts = [
        OrbOperationalDraftAction(
            title="Review safeguarding theme",
            description="Follow local procedure",
            priority="urgent",
            review_required=True,
        )
    ]
    result = orb_operational_action_builder_service.create_actions_from_drafts(
        drafts,
        {"id": 1, "role": "manager"},
        conn=MagicMock(),
        home_id=10,
    )
    assert result["created_ids"]
    assert created


def test_briefing_for_manager_request():
    context = {
        "summary": {
            "headline": "Today at a glance",
            "summary_lines": ["3 chronology items"],
            "attention_items": ["Sign off plan"],
            "safeguarding_signals": ["Theme A"],
        },
        "sources": [{"label": "Brief", "source_type": "brief", "basis": "x"}],
    }
    request = OrbOperationalRequest(message="Create a manager briefing for today", mode="manager_daily_brief")
    briefing = orb_operational_action_builder_service.build_briefing(
        context,
        "Briefing body",
        request,
        force=True,
    )
    assert briefing is not None
    assert briefing.key_points
    assert briefing.title
