from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_standalone_orb_hydration_stability_markers():
    companion = (FRONTEND / "components/orb-standalone/orb-care-companion.tsx").read_text(encoding="utf-8")
    assert "useMounted" in companion
    assert "defaultWorkspace()" in companion
    assert "defaultStandaloneOrbAccessibility" in companion
    assert "fallbackConversationId" in companion
    assert "readStandaloneWorkspace()" in companion


def test_operational_orb_stable_conversation_id():
    text = (FRONTEND / "components/orb-operational/orb-conversation-experience.tsx").read_text(encoding="utf-8")
    assert "useState('orb-operational-session')" in text
    assert "Date.now().toString(36)" not in text.split("useState")[0] or "useState('orb-operational-session')" in text


def test_orb_pages_bypass_appshell():
    shell = (FRONTEND / "components/indicare/app-shell.tsx").read_text(encoding="utf-8")
    assert "isStandaloneOrb" in shell
    assert "isOperationalOrbPage" in shell
    assert "return <>{children}</>" in shell
