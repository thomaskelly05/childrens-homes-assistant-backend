from __future__ import annotations

from pathlib import Path

from services.orb_recording_framework_service import match_record_types_for_document


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend-next"


def read_frontend(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_missing_policy_suggests_related_record_types():
    matches = match_record_types_for_document(
        "Missing from home policy including return conversation, manager oversight and risk assessment."
    )
    ids = [m["id"] for m in matches]
    assert "missing_from_home_record" in ids
    assert "risk_assessment_update" in ids or "manager_summary" in ids


def test_document_panel_has_record_type_selector():
    panel = read_frontend("components/orb-standalone/orb-document-panel.tsx")
    assert "data-orb-document-record-type-select" in panel
    assert "matchOrbRecordingTypesForDocument" in panel
    assert "Review against record type" in panel
