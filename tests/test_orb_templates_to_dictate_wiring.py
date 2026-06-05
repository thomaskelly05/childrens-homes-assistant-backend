from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend-next"


def read_frontend(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_dictate_station_accepts_initial_studio_template():
    station = read_frontend("components/orb-standalone/orb-dictate-station.tsx")
    assert "initialStudioTemplateId" in station
    assert "resolveOrbRecordingRecordType" in station


def test_recording_action_opens_dictate_with_template():
    companion = read_frontend("components/orb-standalone/orb-care-companion.tsx")
    assert "action === 'dictate'" in companion
    assert "studioTemplateId: recordType.studio_template_id" in companion


def test_dictate_brain_uses_record_type():
    brain = read_frontend("components/orb/dictate/OrbDictateBrainPanel.tsx")
    assert "recordTypeId" in brain
    outputs = read_frontend("components/orb/dictate/OrbDictateSuggestedOutputs.tsx")
    assert "data-orb-suggested-outputs-record-type" in outputs
