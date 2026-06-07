from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend-next"


def read_frontend(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_voice_station_you_said_and_orb_replied_sections():
    station = read_frontend("components/orb-standalone/orb-voice-station.tsx")
    assert "data-orb-voice-you-said" in station
    assert "data-orb-voice-orb-replied" in station
    assert "ORB replied" in station
    assert "You said" in station


def test_recent_voice_turns_compact_list():
    station = read_frontend("components/orb-standalone/orb-voice-station.tsx")
    assert "data-orb-voice-recent-turns" in station


def test_dictate_bridge_actions():
    station = read_frontend("components/orb-standalone/orb-voice-station.tsx")
    assert "data-orb-voice-to-dictate" in read_frontend(
        "components/orb-standalone/orb-voice-transcript-actions.tsx"
    )
    assert "data-orb-voice-to-record" in station
    assert "data-orb-voice-handover" in station
    assert "data-orb-voice-to-write" in station
    assert "data-orb-voice-manager-oversight" in station
    assert "data-orb-voice-action-list" in station


def test_voice_syncs_orb_replies_into_transcript():
    station = read_frontend("components/orb-standalone/orb-voice-station.tsx")
    assert "lastSyncedReplyKeyRef" in station
    assert "provider: 'orb_brain'" in station
