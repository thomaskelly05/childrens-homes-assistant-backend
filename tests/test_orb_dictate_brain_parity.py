"""Dictate generate/edit/analyse — shared ORB intelligence parity with Chat."""

from __future__ import annotations

import pytest

from schemas.orb_dictate import (
    OrbDictateAnalyzeRequest,
    OrbDictateEditRequest,
    OrbDictateGenerateRequest,
    OrbDictatePrepareWriteRequest,
)
from services.orb_dictate_edit_service import edit_dictate_document
from services.orb_dictate_service import (
    analyze_dictate_session,
    generate_dictate_note,
    prepare_write_document,
)
from services.orb_document_brain_adapter_service import finalize_document_intelligence


def test_finalize_document_intelligence_adapter_exists():
    text = "Young person settled after tea."
    answer, meta = finalize_document_intelligence(
        indicare_intelligence={"version": "test", "gaps": []},
        document_text=text,
        note_type="daily_record",
    )
    assert answer
    assert "answer_quality_gate" in meta


def test_dictate_generate_uses_shared_brain_adapter(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    result = generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text="Young person settled after tea. Staff offered calm voice.",
            note_type="daily_record",
        )
    )
    meta = result.brain_metadata or {}
    assert meta.get("brain_adapter") == "orb_document_brain_adapter"
    assert meta.get("feature") == "dictate"


def test_dictate_analyze_includes_brain_metadata():
    result = analyze_dictate_session(
        OrbDictateAnalyzeRequest(
            input_text="Staff supported the young person after contact.",
            note_type="incident_record",
        )
    )
    assert result.brain_metadata is not None
    assert result.brain_metadata.get("feature") == "dictate_analyze"


def test_dictate_edit_includes_brain_metadata(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    result = edit_dictate_document(
        OrbDictateEditRequest(
            document_text="Incident in lounge — staff intervened.",
            note_type="incident_record",
            mode="therapeutic_rewrite",
        )
    )
    assert result.brain_metadata is not None
    assert result.brain_metadata.get("feature") == "dictate_edit"


def test_dictate_prompts_missing_child_voice():
    result = analyze_dictate_session(
        OrbDictateAnalyzeRequest(
            input_text="Staff supported the young person after contact.",
            note_type="daily_record",
        )
    )
    assert any("child" in p.lower() for p in result.missing_information)


def test_dictate_prompts_safeguarding_for_incident():
    result = analyze_dictate_session(
        OrbDictateAnalyzeRequest(
            input_text="Physical altercation in the lounge.",
            note_type="incident_record",
        )
    )
    assert result.safeguarding_concerns or any(
        "safeguard" in p.lower() for p in result.missing_information
    )


def test_dictate_does_not_invent_facts_in_fallback(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    result = generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text="Brief note.",
            note_type="daily_record",
        )
    )
    assert "[Add detail from your dictation]" in result.professional_note or "review" in result.professional_note.lower()


def test_prepare_write_structured_sections_with_prompts():
    result = prepare_write_document(
        OrbDictatePrepareWriteRequest(
            note_type="missing_episode_note",
            record_type_id="missing_from_home_record",
        )
    )
    assert "##" in result.structured_body
    assert "*" in result.structured_body
    assert result.section_prompts
    assert result.brain_metadata is not None


def test_prepare_write_missing_fields_become_prompts_not_invented_content():
    result = prepare_write_document(
        OrbDictatePrepareWriteRequest(
            note_type="missing_episode_note",
            transcript="Young person returned at 02:30.",
        )
    )
    body_lower = result.structured_body.lower()
    assert "child voice" in body_lower or "return" in body_lower
    assert "invented" not in body_lower
