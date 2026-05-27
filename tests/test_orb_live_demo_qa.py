from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
FRONTEND = REPO / "frontend-next"

STANDALONE_COMPANION = FRONTEND / "components" / "orb-standalone" / "orb-care-companion.tsx"
OPERATIONAL = FRONTEND / "app" / "assistant" / "orb" / "operational-orb-page.tsx"
RULES = FRONTEND / "lib" / "orb" / "orb-presence-rules.ts"


def test_standalone_orb_send_or_retry_markers():
    text = STANDALONE_COMPANION.read_text(encoding="utf-8")
    assert "orb-send-error" in text
    assert "Retry" in text


def test_operational_orb_send_or_retry_markers():
    text = OPERATIONAL.read_text(encoding="utf-8")
    assert "orb-operational" in text.lower() or "OrbConversationExperience" in text


def test_recording_editor_suppresses_shell_orb_rail():
    rules = RULES.read_text(encoding="utf-8")
    assert "isRecordingEditorPathStrict" in rules
    assert "pathname === '/record'" in rules
    assert "shouldShowOrbRail" in rules
    hub = (FRONTEND / "components" / "indicare" / "record" / "record-hub.tsx").read_text(encoding="utf-8")
    assert "!hasTypeSelected" in hub and "record-hub-operational-orb-link" in hub
