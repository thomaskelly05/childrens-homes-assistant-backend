from __future__ import annotations

from schemas.recording_drafts import RecordingDraftRecord
from services.recording_chronology_link_service import recording_chronology_link_service


def _draft(recording_type: str = "daily-note") -> RecordingDraftRecord:
    return RecordingDraftRecord(
        id="d1",
        title="T",
        body="B",
        recording_type=recording_type,
        status="submitted",
        review_status="not_required",
        child_id=1,
        created_at="2026-05-01T00:00:00Z",
        updated_at="2026-05-01T00:00:00Z",
    )


def test_chronology_supported_for_daily_note():
    assert recording_chronology_link_service.chronology_supported_for_type("daily-note") is True


def test_no_fake_chronology_without_formal_record():
    chronology_id, warnings = recording_chronology_link_service.create_or_prepare_link(
        _draft(), None, {"id": "1"}
    )
    assert chronology_id is None
    assert warnings


def test_extracts_chronology_from_workflow():
    chronology_id, _ = recording_chronology_link_service.create_or_prepare_link(
        _draft(),
        {"id": 99, "workflow": {"chronology_event_id": 555}},
        {"id": "1"},
    )
    assert chronology_id == "555"


def test_chronology_supported_for_keywork_and_health():
    assert recording_chronology_link_service.chronology_supported_for_type("keywork") is True
    assert recording_chronology_link_service.chronology_supported_for_type("health-appointment") is True


def test_no_fake_chronology_when_workflow_empty():
    chronology_id, warnings = recording_chronology_link_service.create_or_prepare_link(
        _draft("keywork"),
        {"id": 10, "workflow": {}},
        {"id": "1"},
    )
    assert chronology_id is None
    assert warnings
