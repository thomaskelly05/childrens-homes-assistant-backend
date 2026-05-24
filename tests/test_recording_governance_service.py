from __future__ import annotations

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from schemas.recording_governance import RecordingGovernanceFilters
from services.recording_draft_service import recording_draft_service
from services.recording_governance_service import recording_governance_service
from services.recording_review_service import recording_review_service


@pytest.fixture(autouse=True)
def memory_drafts(monkeypatch):
    recording_draft_service._memory = {}
    recording_review_service._memory_events = []
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_review_service, "_detect_storage_mode", lambda: "memory")


def test_builds_dashboard(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Safeguarding concern",
            body="Sensitive narrative that must not appear in governance cards.",
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
            privacy_flags=["identifier:phone"],
            structured_data={
                "template_id": "safeguarding-concern-v1",
                "values": {},
            },
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    dashboard = recording_governance_service.build_dashboard(user, conn=None)
    assert dashboard.summary_cards
    assert dashboard.backlog.awaiting_review >= 1
    assert dashboard.quality.privacy_flags >= 1
    assert dashboard.privacy_notice
    assert any("raw record bodies" in dashboard.privacy_notice for _ in [1])


def test_counts_safeguarding_and_incomplete_structured(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Restraint",
            body="Details",
            recording_type="physical-intervention",
            manager_review_required=True,
            metadata={"structured_template": {"required_missing": ["follow_up"]}},
        ),
        user,
    )
    dashboard = recording_governance_service.build_dashboard(user, conn=None)
    assert dashboard.quality.manager_review_flags >= 1
    assert dashboard.quality.incomplete_structured_forms >= 1


def test_builds_form_usage_and_alerts(fake_state):
    user = fake_state["user"]
    for idx in range(2):
        recording_draft_service.create_draft(
            RecordingDraftCreate(
                title=f"Daily {idx}",
                body="Note",
                recording_type="daily-note",
                form_id="daily-note",
            ),
            user,
        )
    dashboard = recording_governance_service.build_dashboard(user, conn=None)
    assert dashboard.form_usage
    assert dashboard.form_usage[0].count >= 2
    assert dashboard.alerts


def test_governance_items_exclude_body(fake_state):
    user = fake_state["user"]
    secret = "SECRET BODY TEXT MUST NOT LEAK"
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Test",
            body=secret,
            recording_type="incident",
        ),
        user,
    )
    items = recording_governance_service.list_governance_items(user, conn=None)
    dumped = " ".join(item.model_dump_json() for item in items)
    assert secret not in dumped
    assert "body" not in dumped.lower() or "draft_route" in dumped


def test_access_control_conservative_for_staff(monkeypatch, fake_state):
    staff_user = {**fake_state["user"], "role": "support_worker", "id": "staff-2"}
    manager = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(title="Manager draft", body="x", recording_type="incident"),
        manager,
    )
    assert recording_governance_service.enforce_governance_access(manager) is True
    assert recording_governance_service.enforce_governance_access(staff_user) is False
    staff_dashboard = recording_governance_service.build_dashboard(
        staff_user, RecordingGovernanceFilters(), conn=None
    )
    assert staff_dashboard.scope == "own_drafts"


def test_health_ready(fake_state):
    health = recording_governance_service.get_health(conn=None)
    assert health.operational_only is True
    assert health.standalone_access is False
