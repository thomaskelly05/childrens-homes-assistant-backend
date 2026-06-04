from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend-next"


def read_frontend(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_indicare_intelligence_core_lib_prefers_core_over_legacy():
    lib = read_frontend("lib/orb/indicare-intelligence-core.ts")
    assert "indicare_intelligence_core" in lib
    assert "expert_brain_9" in lib
    assert "shouldPauseVoiceAutoSend" in lib
    assert "shouldBlockAutoSpokenReply" in lib


def test_voice_auto_send_pause_for_critical_depth():
    lib = read_frontend("lib/orb/indicare-intelligence-core.ts")
    assert "safeguarding_critical" in lib
    assert "residential_deep" in lib


def test_care_companion_wires_intelligence_panel_and_auto_send():
    companion = read_frontend("components/orb-standalone/orb-care-companion.tsx")
    assert "shouldPauseVoiceAutoSend" in companion
    assert "shouldBlockAutoSpokenReply" in companion
    assert "contextUsed" in companion
    assert "OrbIntelligenceCorePanel" in read_frontend("components/orb-standalone/orb-assistant-message.tsx")


def test_standalone_client_types_include_core_metadata():
    client = read_frontend("lib/orb/standalone-client.ts")
    assert "IndicareIntelligenceCoreContext" in client
    assert "indicare_intelligence_core" in client
    assert "answer_quality_gate" in client
