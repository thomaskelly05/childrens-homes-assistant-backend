from __future__ import annotations

import pytest

from schemas.recording_drafts import RecordingDraftCreate, RecordingDraftUpdate
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def memory_drafts(monkeypatch):
    svc = recording_draft_service
    svc._memory = {}
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "memory")


def test_create_draft_stores_structured_data(fake_state):
    user = fake_state["user"]
    created = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Safeguarding",
            body="Free text narrative",
            recording_type="safeguarding-concern",
            form_id="safeguarding-concern",
            manager_review_required=True,
            structured_data={
                "values": {
                    "what_was_noticed_or_said": "Bruising noted",
                    "date_time": "2026-05-24",
                    "immediate_actions_taken": "Photographed with consent process",
                    "child_current_safety": "With keyworker",
                    "who_was_informed": "Manager",
                }
            },
        ),
        user,
    )
    assert created.structured_template_id == "safeguarding-concern"
    assert created.structured_data
    assert created.structured_summary
    assert created.manager_review_required is True
    assert created.safeguarding_review_required is True


def test_update_preserves_old_drafts_without_structured(fake_state):
    user = fake_state["user"]
    created = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Note",
            body="Simple note",
            recording_type="daily-note",
        ),
        user,
    )
    assert not created.structured_template_id
    updated = recording_draft_service.update_draft(
        created.id,
        RecordingDraftUpdate(body="Updated note"),
        user,
    )
    assert updated
    assert not updated.structured_template_id


def test_structured_review_triggers_on_draft(fake_state):
    user = fake_state["user"]
    created = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Disclosure",
            body="Narrative",
            recording_type="disclosure",
            form_id="disclosure",
            structured_data={
                "values": {
                    "what_was_disclosed": "Child shared concern",
                    "adult_response": "Listened without questioning",
                    "immediate_safety_action": "Stayed with child",
                    "who_was_informed": "Manager on duty",
                    "follow_up": "Safeguarding lead to be informed",
                }
            },
        ),
        user,
    )
    assert isinstance(created.structured_review_triggers, list)
    assert created.review_status in {"manager_review_required", "safeguarding_review_required"}
