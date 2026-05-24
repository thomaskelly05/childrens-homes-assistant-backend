from __future__ import annotations

import pytest

from schemas.recording_alerts import RecordingAlertActionRequest
from schemas.recording_drafts import RecordingDraftCreate
from services.recording_alert_service import recording_alert_service
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def memory_alerts(monkeypatch):
    recording_alert_service._memory = {}
    recording_draft_service._memory = {}
    monkeypatch.setattr(recording_alert_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")


def test_generates_high_risk_review_alert(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Restraint",
            body="SECRET BODY",
            recording_type="physical-intervention",
            manager_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    result = recording_alert_service.generate_alerts(user, conn=None)
    types = {a.alert_type for a in result.alerts}
    assert "high_risk_review_due" in types or "manager_review_required" in types


def test_generates_safeguarding_review_alert(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Concern",
            body="SECRET",
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
            safeguarding_sensitive=True,
        ),
        user,
    )
    result = recording_alert_service.generate_alerts(user, conn=None)
    assert any(a.alert_type == "safeguarding_review_due" for a in result.alerts)


def test_generates_structured_missing_alert(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Structured",
            body="SECRET",
            recording_type="safeguarding-concern",
            structured_data={"template_id": "safeguarding-concern-v1", "values": {}},
            metadata={"structured_template": {"required_missing": ["follow_up"]}},
        ),
        user,
    )
    result = recording_alert_service.generate_alerts(user, conn=None)
    assert any(a.alert_type == "structured_fields_missing" for a in result.alerts)


def test_generates_privacy_flags_alert(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Privacy",
            body="SECRET",
            recording_type="daily-note",
            privacy_flags=["identifier:phone"],
        ),
        user,
    )
    result = recording_alert_service.generate_alerts(user, conn=None)
    assert any(a.alert_type == "privacy_flags_unresolved" for a in result.alerts)


def test_generates_changes_requested_alert(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Changes",
            body="SECRET",
            recording_type="incident",
            manager_review_required=True,
        ),
        user,
    )
    from schemas.recording_drafts import RecordingDraftUpdate

    recording_draft_service.update_draft(
        draft.id,
        RecordingDraftUpdate(review_status="changes_requested"),
        user,
    )
    result = recording_alert_service.generate_alerts(user, conn=None)
    assert any(a.alert_type == "changes_requested_pending" for a in result.alerts)


def test_dedupes_open_alerts(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Dup",
            body="SECRET",
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
        ),
        user,
    )
    first = recording_alert_service.generate_alerts(user, conn=None)
    second = recording_alert_service.generate_alerts(user, conn=None)
    assert second.skipped >= 1 or second.created == 0
    assert first.created >= 1


def test_acknowledge_assign_resolve_archive(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Lifecycle",
            body="SECRET",
            recording_type="daily-note",
            privacy_flags=["test"],
        ),
        user,
    )
    gen = recording_alert_service.generate_alerts(user, conn=None)
    alert = gen.alerts[0]

    ack = recording_alert_service.apply_alert_action(
        alert.id,
        RecordingAlertActionRequest(action="acknowledge", note="Seen"),
        user,
        conn=None,
    )
    assert ack.success and ack.alert.status == "acknowledged"

    assigned = recording_alert_service.apply_alert_action(
        alert.id,
        RecordingAlertActionRequest(action="assign", owner_name="Duty manager"),
        user,
        conn=None,
    )
    assert assigned.alert.status == "assigned"

    resolved = recording_alert_service.apply_alert_action(
        alert.id,
        RecordingAlertActionRequest(action="resolve", note="Followed up"),
        user,
        conn=None,
    )
    assert resolved.alert.status == "resolved"

    archived = recording_alert_service.apply_alert_action(
        alert.id,
        RecordingAlertActionRequest(action="archive"),
        user,
        conn=None,
    )
    assert archived.alert.status == "archived"


def test_safe_summary_excludes_body(fake_state):
    user = fake_state["user"]
    secret = "RAW BODY MUST NOT APPEAR IN ALERT"
    recording_draft_service.create_draft(
        RecordingDraftCreate(title="T", body=secret, recording_type="incident", privacy_flags=["x"]),
        user,
    )
    gen = recording_alert_service.generate_alerts(user, conn=None)
    dumped = " ".join(a.model_dump_json() for a in gen.alerts)
    assert secret not in dumped
    assert "body" not in dumped.lower() or "no_raw_body" in dumped


def test_access_control_conservative_for_staff(monkeypatch, fake_state):
    staff = {**fake_state["user"], "role": "support_worker", "id": "staff-x"}
    manager = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(title="M", body="x", recording_type="incident", privacy_flags=["f"]),
        manager,
    )
    gen = recording_alert_service.generate_alerts(manager, conn=None)
    listed_staff = recording_alert_service.list_alerts(staff, conn=None)
    if gen.alerts:
        got = recording_alert_service.get_alert(gen.alerts[0].id, staff, conn=None)
        assert got is None or listed_staff.total == 0
