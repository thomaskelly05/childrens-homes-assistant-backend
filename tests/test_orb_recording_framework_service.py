from __future__ import annotations

from services.orb_recording_framework_service import (
    get_framework_payload,
    get_record_type,
    list_record_types,
    match_record_types_for_document,
    orb_checks_summary,
    resolve_record_type,
    structure_document_body,
    suggested_outputs_payload,
)


def test_framework_has_21_record_types():
    types = list_record_types()
    assert len(types) == 21
    ids = {t["id"] for t in types}
    assert "missing_from_home_record" in ids
    assert "reg_45_reflection" in ids


def test_resolve_by_studio_template():
    record = resolve_record_type(template_id="missing")
    assert record["id"] == "missing_from_home_record"


def test_resolve_by_note_type():
    record = resolve_record_type(note_type="incident_record")
    assert record["dictate_note_type"] == "incident_record"


def test_orb_checks_summary_is_compact():
    record = get_record_type("safeguarding_concern")
    assert record is not None
    checks = orb_checks_summary(record)
    assert 3 <= len(checks) <= 8


def test_suggested_outputs_for_missing_record():
    outputs = suggested_outputs_payload("missing_from_home_record")
    labels = [o["label"] for o in outputs]
    assert "Chronology Entry" in labels
    assert "Social Worker Update" in labels


def test_structure_document_applies_headings():
    record = get_record_type("daily_record")
    assert record is not None
    body = structure_document_body(record_type=record, professional_note="Shift note text.")
    assert "## Date and time" in body
    assert "Shift note text." in body


def test_match_policy_document_to_record_types():
    text = "Missing from home policy — return conversation and exploitation indicators."
    matches = match_record_types_for_document(text)
    assert matches
    assert matches[0]["id"] == "missing_from_home_record"


def test_framework_payload_version():
    payload = get_framework_payload()
    assert payload["version"]
    assert len(payload["record_types"]) == 21
