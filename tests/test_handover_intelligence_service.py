from __future__ import annotations

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from services.handover_intelligence_service import handover_intelligence_service
from services.isn_digest_service import isn_digest_service
from services.recording_alert_service import recording_alert_service
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def memory_mode(monkeypatch):
    recording_alert_service._memory = {}
    recording_draft_service._memory = {}
    isn_digest_service._memory_alerts = {}
    from services.handover_draft_service import handover_draft_service as hds

    hds._memory = {}
    monkeypatch.setattr(recording_alert_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(hds, "_detect_storage_mode", lambda *a, **k: "memory")


def test_build_dashboard_metadata_only(fake_state):
    user = fake_state["user"]
    secret = "RAW HANDOVER BODY MUST NOT LEAK"
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Handover test",
            body=secret,
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
        ),
        user,
    )
    recording_alert_service.generate_alerts(user, conn=None)
    dashboard = handover_intelligence_service.build_dashboard(user, conn=None)
    dumped = dashboard.model_dump_json()
    assert secret not in dumped
    assert dashboard.sections
    assert dashboard.privacy_notice
    assert dashboard.metadata.get("no_raw_body") is True
    section_ids = {s.id for s in dashboard.sections}
    assert "recording_alerts" in section_ids
    assert "safeguarding_isn" in section_ids
    assert "reviews" in section_ids
    assert "actions" in section_ids
    assert "next_shift_priorities" in section_ids
    assert "staff_shift" in section_ids


def test_staff_shift_section_metadata_only(fake_state):
    user = fake_state["user"]
    section = handover_intelligence_service.build_staff_shift_section(user, conn=None)
    assert section.id == "staff_shift"
    assert section.title == "Staff and shift context"
    for item in section.items:
        assert item.metadata.get("no_raw_body") is True


def test_recording_alerts_section(fake_state):
    user = fake_state["user"]
    section = handover_intelligence_service.build_recording_alerts_section(user, conn=None)
    for item in section.items:
        assert item.metadata.get("no_raw_body") is True
        assert "RAW" not in item.safe_summary.upper() or len(item.safe_summary) < 50


def test_degraded_section_warning(fake_state, monkeypatch):
    user = fake_state["user"]

    def boom(*_a, **_k):
        raise RuntimeError("simulated failure")

    monkeypatch.setattr(
        "services.handover_intelligence_service.recording_alert_service.build_digest",
        boom,
    )
    section = handover_intelligence_service.build_recording_alerts_section(user, conn=None)
    assert section.warnings
    assert section.metadata.get("degraded") is True
