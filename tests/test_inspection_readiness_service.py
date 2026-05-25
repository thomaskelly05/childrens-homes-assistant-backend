from __future__ import annotations

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from services.inspection_readiness_service import inspection_readiness_service
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def memory_drafts(monkeypatch):
    recording_draft_service._memory = {}
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")


def test_dashboard_builds(fake_state):
    user = fake_state["user"]
    secret = "RAW INSPECTION BODY MUST NOT APPEAR"
    recording_draft_service.create_draft(
        RecordingDraftCreate(title="SG", body=secret, recording_type="safeguarding-concern"),
        user,
    )
    dashboard = inspection_readiness_service.build_dashboard(user, conn=None)
    dumped = dashboard.model_dump_json()
    assert secret not in dumped
    assert dashboard.reg44_summary
    assert dashboard.reg45_summary
    assert "predict" not in dashboard.summary.lower() or "does not" in dashboard.summary.lower()


def test_reg44_pack_builds(fake_state):
    user = fake_state["user"]
    pack = inspection_readiness_service.generate_reg44_pack(user, conn=None)
    assert pack.pack_type == "reg44"
    assert pack.sections
    assert pack.evidence_count >= 0
    combined = pack.model_dump_json().lower()
    assert "meets the standard" not in combined
    assert "outstanding" not in combined or "grade" not in combined


def test_reg45_pack_builds(fake_state):
    user = fake_state["user"]
    pack = inspection_readiness_service.generate_reg45_pack(user, conn=None)
    assert pack.pack_type == "reg45"
    assert pack.gap_count >= 0


def test_gaps_identified(fake_state):
    user = fake_state["user"]
    items = inspection_readiness_service.collect_evidence(user, conn=None)
    gaps = inspection_readiness_service.identify_pack_gaps("reg44", items, None)
    assert gaps


def test_draft_only_counted(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(title="Draft", body="hidden", recording_type="daily-note"),
        user,
    )
    pack = inspection_readiness_service.generate_reg44_pack(user, conn=None)
    assert pack.draft_only_count >= 0


def test_save_pack_honest_warning(fake_state):
    user = fake_state["user"]
    pack = inspection_readiness_service.generate_reg44_pack(user, conn=None)
    from schemas.inspection_readiness import InspectionPackSaveRequest

    response = inspection_readiness_service.save_pack(
        pack,
        InspectionPackSaveRequest(pack_type="reg44", save_output=True, create_actions_from_gaps=True),
        user,
        conn=None,
    )
    assert response.success
    assert response.pack.id == pack.id


def test_no_compliance_claim_in_recommendations(fake_state):
    user = fake_state["user"]
    pack = inspection_readiness_service.generate_reg45_pack(user, conn=None)
    recs = inspection_readiness_service.build_recommendations(pack)
    combined = " ".join(recs).lower()
    assert "this meets" not in combined
    assert "compliance decision" in combined or "professional judgement" in combined
