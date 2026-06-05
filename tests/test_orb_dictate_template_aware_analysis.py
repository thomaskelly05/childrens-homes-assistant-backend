from __future__ import annotations

from schemas.orb_dictate import OrbDictateAnalyzeRequest
from services.orb_dictate_service import analyze_dictate_session


def test_analyze_returns_framework_fields_for_missing_record():
    result = analyze_dictate_session(
        OrbDictateAnalyzeRequest(
            input_text="Young person returned at 11pm. Presentation was tired.",
            note_type="missing_episode_note",
            template_id="missing",
            record_type_id="missing_from_home_record",
        )
    )
    assert result.record_type_id == "missing_from_home_record"
    assert result.detected_record_type == "Missing From Home Record"
    assert result.required_sections
    assert result.orb_will_check
    assert any("return" in item.lower() for item in result.orb_will_check + result.missing_information)


def test_analyze_suggested_outputs_are_record_type_specific():
    daily = analyze_dictate_session(
        OrbDictateAnalyzeRequest(
            input_text="Routine shift with positive engagement at tea time.",
            note_type="daily_record",
            record_type_id="daily_record",
        )
    )
    missing = analyze_dictate_session(
        OrbDictateAnalyzeRequest(
            input_text="Missing episode overnight.",
            note_type="missing_episode_note",
            record_type_id="missing_from_home_record",
        )
    )
    assert daily.possible_outputs != missing.possible_outputs
    assert "Handover" in daily.possible_outputs or "Daily Record" in daily.possible_outputs


def test_analyze_includes_recording_quality_guidance():
    result = analyze_dictate_session(
        OrbDictateAnalyzeRequest(
            input_text="Brief note without much detail.",
            note_type="incident_record",
            record_type_id="incident_report",
        )
    )
    assert result.recording_quality_guidance
    assert "fact" in result.recording_quality_guidance.lower()
