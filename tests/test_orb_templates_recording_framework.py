from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend-next"


def read_frontend(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_templates_panel_includes_recording_library():
    panel = read_frontend("components/orb-standalone/orb-templates-panel.tsx")
    cards = read_frontend("components/orb/recording/OrbRecordingLibraryCards.tsx")
    assert "OrbRecordingLibraryCards" in panel
    assert "data-orb-recording-library" in cards
    assert "data-orb-recording-start-dictate" in cards
    assert "data-orb-recording-open-write" in cards


def test_recording_cards_use_shared_framework():
    framework = read_frontend("lib/orb/recording/orb-recording-framework.ts")
    cards = read_frontend("components/orb/recording/OrbRecordingLibraryCards.tsx")
    assert "ORB_RECORDING_RECORD_TYPES" in framework
    assert "orbRecordingChecksSummary" in cards
