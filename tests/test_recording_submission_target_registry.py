from __future__ import annotations

from services.recording_submission_target_registry import recording_submission_target_registry


def test_daily_note_target_exists():
    target = recording_submission_target_registry.get_target("daily-note")
    assert target.target_status == "supported_now"
    assert target.target_record_type == "daily_note"
    assert target.requires_child is True


def test_incident_target_exists():
    target = recording_submission_target_registry.get_target("incident")
    assert target.target_status == "supported_now"
    assert target.target_record_type == "incident"


def test_safeguarding_target_review_required():
    target = recording_submission_target_registry.get_target("safeguarding-concern")
    assert target.target_status == "review_required_before_submit"
    assert target.safeguarding_sensitive is True


def test_unsupported_target_is_draft_only():
    target = recording_submission_target_registry.get_target("unknown-form-xyz")
    assert target.target_status in {"unsupported", "submit_as_draft_only"}


def test_target_route_hints():
    hint = recording_submission_target_registry.route_hint("daily-note")
    assert "daily" in hint.lower() or "create" in hint.lower()
    draft_only = recording_submission_target_registry.route_hint("room-search")
    assert "not wired" in draft_only.lower() or "formal" in draft_only.lower()


def test_requires_review_for_physical_intervention():
    assert recording_submission_target_registry.requires_review("physical-intervention") is True


def test_keywork_family_education_health_supported():
    for recording_type, record_type in (
        ("keywork", "keywork"),
        ("family-time", "family_contact"),
        ("education-note", "education"),
        ("health-appointment", "health_appointment"),
    ):
        target = recording_submission_target_registry.get_target(recording_type)
        assert target.target_status == "supported_now", recording_type
        assert target.target_record_type == record_type


def test_missing_supported_with_review():
    target = recording_submission_target_registry.get_target("missing")
    assert target.target_status == "supported_now"
    assert target.requires_manager_review is True
    assert recording_submission_target_registry.requires_review("missing") is True


def test_handover_routes_to_existing_workflow():
    target = recording_submission_target_registry.get_target("handover")
    assert target.target_status == "route_to_existing_workflow"


def test_medication_stays_review_required():
    target = recording_submission_target_registry.get_target("medication-note-error")
    assert target.target_status == "review_required_before_submit"


def test_supported_now_route_hint_copy():
    hint = recording_submission_target_registry.route_hint("keywork")
    assert "submitted into the formal" in hint.lower()
