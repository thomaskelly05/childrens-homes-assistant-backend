from __future__ import annotations

import pytest

from schemas.orb_dictate import OrbDictateAnalyzeRequest, OrbDictateBrainSuggestion
from services.orb_dictate_service import analyze_dictate_session, finalise_dictate_document
from schemas.orb_dictate import OrbDictateFinaliseRequest


def test_analyze_includes_suggestions_for_weak_quality():
    result = analyze_dictate_session(
        OrbDictateAnalyzeRequest(
            input_text="Brief note.",
            note_type="safeguarding_concern_record",
        )
    )
    assert result.professional_wording_suggestions
    assert result.recording_quality_score in {"good", "needs_review"}
    assert all(s.status == "suggested" for s in result.professional_wording_suggestions)


def test_finalise_applies_accepted_suggestions():
    accepted = [
        OrbDictateBrainSuggestion(
            id="s1",
            label="Add manager oversight",
            detail="Document manager notification.",
            status="accepted",
        )
    ]
    result = finalise_dictate_document(
        OrbDictateFinaliseRequest(
            input_text="Incident during evening shift.",
            note_type="incident_record",
            accepted_suggestions=accepted,
        )
    )
    assert "Accepted suggestions" in result.professional_note
    assert "manager oversight" in result.professional_note.lower() or "Manager" in result.professional_note


def test_analyze_uses_existing_intelligence_path(monkeypatch):
    calls: list[str] = []

    def fake_build_packet(text, mode=None):
        calls.append("intel")
        return {"gaps": [{"gap_id": "child_voice", "label": "Child voice"}], "version": "test"}

    monkeypatch.setattr(
        "services.orb_dictate_service.indicare_intelligence_core_service.build_intelligence_packet",
        fake_build_packet,
    )
    result = analyze_dictate_session(
        OrbDictateAnalyzeRequest(input_text="Test transcript with enough content here.", note_type="daily_record")
    )
    assert calls == ["intel"]
    assert result.ofsted_evidence_check is not None
