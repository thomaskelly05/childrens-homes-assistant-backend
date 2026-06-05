from __future__ import annotations

from schemas.orb_dictate import OrbDictateFinaliseRequest
from services.orb_dictate_service import finalise_dictate_document


def test_finalise_applies_framework_headings_and_metadata():
    result = finalise_dictate_document(
        OrbDictateFinaliseRequest(
            input_text="Child returned at 22:30 after missing episode. Manager informed.",
            note_type="missing_episode_note",
            template_id="missing",
            record_type_id="missing_from_home_record",
        )
    )
    assert result.record_type_id == "missing_from_home_record"
    assert result.record_type_label == "Missing From Home Record"
    assert result.document_headings
    assert "## Time missing" in result.professional_note or "## Return time" in result.professional_note
    assert result.review_required_statement


def test_finalise_preserves_adult_edits_with_existing_headings():
    edited = "## Return time\n\n22:30 — adult verified wording."
    result = finalise_dictate_document(
        OrbDictateFinaliseRequest(
            input_text="Return at night.",
            note_type="missing_episode_note",
            record_type_id="missing_from_home_record",
            adult_edits=edited,
        )
    )
    assert edited in result.professional_note
