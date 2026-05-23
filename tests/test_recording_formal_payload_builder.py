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


def test_builds_keywork_payload():
    draft = _draft(recording_type="keywork", title="Session topic")
    target = recording_submission_target_registry.get_target("keywork")
    payload = recording_formal_payload_builder.build_payload(draft, target)
    assert payload["topic"] == "Session topic"
    assert payload["summary"] == "Test body narrative"
    assert payload["metadata"]["draft_id"] == "draft-1"
    assert "orb" not in str(payload).lower()


def test_builds_family_time_payload():
    draft = _draft(recording_type="family-time")
    target = recording_submission_target_registry.get_target("family-time")
    payload = recording_formal_payload_builder.build_payload(draft, target)
    assert payload["contact_type"] == "family_time"
    assert payload["metadata"]["source"] == "record_workspace"


def test_builds_education_and_health_appointment_payloads():
    edu = recording_formal_payload_builder.build_payload(
        _draft(recording_type="education-note"),
        recording_submission_target_registry.get_target("education-note"),
    )
    assert edu["record_date"]
    health = recording_formal_payload_builder.build_payload(
        _draft(recording_type="health-appointment"),
        recording_submission_target_registry.get_target("health-appointment"),
    )
    assert health["start_datetime"]
    assert health["title"]


def test_builds_missing_payload_requires_circumstances():
    draft = _draft(recording_type="missing", home_id=3)
    target = recording_submission_target_registry.get_target("missing")
    payload = recording_formal_payload_builder.build_payload(draft, target)
    assert payload["circumstances"]
    assert payload["home_id"] == 3


def test_builds_medication_payload_for_review_types():
    draft = _draft(recording_type="medication-note-error")
    target = RecordingSubmissionTarget(
        recording_type="medication-note-error",
        target_status="review_required_before_submit",
        target_record_type="medication",
    )
    payload = recording_formal_payload_builder.build_payload(draft, target)
    assert payload["metadata"]["manager_review_required"] is True
