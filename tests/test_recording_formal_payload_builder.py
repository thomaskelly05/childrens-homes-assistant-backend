from __future__ import annotations

from schemas.recording_drafts import RecordingDraftRecord
from schemas.recording_submission import RecordingSubmissionTarget
from services.recording_formal_payload_builder import recording_formal_payload_builder
from services.recording_submission_target_registry import recording_submission_target_registry


def _draft(**kwargs) -> RecordingDraftRecord:
    base = {
        "id": "draft-1",
        "title": "Test title",
        "body": "Test body narrative",
        "recording_type": "daily-note",
        "status": "draft",
        "review_status": "not_required",
        "created_at": "2026-05-01T00:00:00Z",
        "updated_at": "2026-05-01T00:00:00Z",
        "child_id": 7,
        "quality_flags": ["add detail"],
        "privacy_flags": ["phone"],
        "manager_review_required": True,
    }
    base.update(kwargs)
    return RecordingDraftRecord(**base)


def test_builds_daily_note_payload():
    draft = _draft()
    target = recording_submission_target_registry.get_target("daily-note")
    payload = recording_formal_payload_builder.build_payload(draft, target)
    assert payload["child_id"] == 7
    assert payload["shift_type"] == "day"
    assert payload["metadata"]["draft_id"] == "draft-1"


def test_builds_incident_payload():
    draft = _draft(recording_type="incident", manager_review_required=True)
    target = recording_submission_target_registry.get_target("incident")
    payload = recording_formal_payload_builder.build_payload(draft, target)
    assert payload["description"] == "Test body narrative"
    assert payload["incident_type"] == "other"


def test_includes_quality_privacy_flags():
    draft = _draft()
    target = recording_submission_target_registry.get_target("daily-note")
    payload = recording_formal_payload_builder.build_payload(draft, target)
    assert payload["metadata"]["quality_flags"] == ["add detail"]
    assert payload["metadata"]["manager_review_required"] is True


def test_uses_child_id_safely():
    draft = _draft(child_id=42)
    target = RecordingSubmissionTarget(
        recording_type="daily-note",
        target_status="supported_now",
        target_record_type="daily_note",
    )
    payload = recording_formal_payload_builder.build_payload(draft, target)
    assert payload["young_person_id"] == 42
