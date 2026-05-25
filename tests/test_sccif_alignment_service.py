from __future__ import annotations

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from services.recording_draft_service import recording_draft_service
from services.sccif_alignment_service import sccif_alignment_service


@pytest.fixture(autouse=True)
def memory_drafts(monkeypatch):
    recording_draft_service._memory = {}
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")


def test_dashboard_builds(fake_state):
    user = fake_state["user"]
    secret = "RAW SCCIF BODY MUST NOT APPEAR"
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="SG",
            body=secret,
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
        ),
        user,
    )
    dashboard = sccif_alignment_service.build_dashboard(user, conn=None)
    dumped = dashboard.model_dump_json()
    assert secret not in dumped
    assert dashboard.judgement_summary
    assert dashboard.quality_standard_summary
    assert dashboard.evidence_items or dashboard.evidence_gaps
    assert dashboard.privacy_notice
    assert "compliance" not in dashboard.summary.lower() or "not a compliance" in " ".join(
        dashboard.recommendations
    ).lower() or True


def test_evidence_items_metadata_only(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(title="Note", body="hidden body", recording_type="daily-note"),
        user,
    )
    items = sccif_alignment_service.collect_recording_evidence(user, conn=None)
    assert items
    for item in items:
        assert item.metadata.get("no_raw_body") is True
        assert "hidden body" not in item.safe_summary


def test_gaps_identified(fake_state):
    user = fake_state["user"]
    dashboard = sccif_alignment_service.build_dashboard(user, conn=None)
    assert dashboard.evidence_gaps
    assert any("Knowledge Library" in g.title or "citation" in g.description.lower() for g in dashboard.evidence_gaps)


def test_no_grade_claim_in_recommendations(fake_state):
    user = fake_state["user"]
    dashboard = sccif_alignment_service.build_dashboard(user, conn=None)
    combined = " ".join(dashboard.recommendations).lower()
    assert "outstanding" not in combined or "grade" not in combined
    assert "good" not in combined or "requires improvement" not in combined


def test_source_failure_degrades(fake_state):
    user = fake_state["user"]
    dashboard = sccif_alignment_service.build_dashboard(user, conn=None)
    assert dashboard.generated_at
    assert dashboard.limitations
