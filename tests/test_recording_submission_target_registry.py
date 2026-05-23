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
