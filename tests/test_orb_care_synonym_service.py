from __future__ import annotations

from services.orb_care_synonym_service import orb_care_synonym_service


def test_absconded_expands_missing_from_care():
    expansion = orb_care_synonym_service.expand_query("child absconded from placement")
    assert "missing_from_care" in expansion["concepts"]
    terms = " ".join(expansion["expanded_terms"]).lower()
    assert "missing from care" in terms or "absconded" in terms


def test_child_voice_expands():
    expansion = orb_care_synonym_service.expand_query("child voice in inspection")
    assert "child_voice" in expansion["concepts"]


def test_daily_note_recording_terms():
    canonical = orb_care_synonym_service.canonical_terms_for_text("help me write a daily note")
    assert "recording quality" in canonical


def test_behaviour_terms_canonicalised():
    canonical = orb_care_synonym_service.canonical_terms_for_text("challenging behaviour escalation")
    assert "behaviour support" in canonical


def test_detect_concepts_safeguarding():
    concepts = orb_care_synonym_service.detect_concepts("disclosure and significant harm")
    assert "safeguarding" in concepts
