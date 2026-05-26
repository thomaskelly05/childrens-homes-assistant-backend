from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
SIDEBAR = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-sidebar.tsx"
SETTINGS = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-settings-panel.tsx"


def test_sidebar_chat_shell_markers():
    sidebar = SIDEBAR.read_text(encoding="utf-8")
    for marker in ("New chat", "Search chats", "Projects", "data-orb-sidebar-tools", "data-orb-sidebar-settings"):
        assert marker in sidebar, marker


def test_welcome_and_starters():
    companion = COMPANION.read_text(encoding="utf-8")
    assert "How can I help?" in companion
    assert "data-orb-starter-card" in companion
    for starter in (
        "Help me write a daily note",
        "Explain Ofsted expectations",
        "Think through a safeguarding concern",
        "Make wording more child-centred",
    ):
        assert starter in companion


def test_coming_next_for_voice_settings():
    settings = SETTINGS.read_text(encoding="utf-8")
    assert "Coming next" in settings
    assert "Wake phrase" in settings or "Voice" in settings
