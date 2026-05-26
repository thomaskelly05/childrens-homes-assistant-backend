from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_app_shell_no_fullscreen_click_blocker():
    shell = (FRONTEND / "components/indicare/app-shell.tsx").read_text(encoding="utf-8")
    assert "fixed inset-0" not in shell


def test_orb_overlay_pointer_events_pattern():
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    orb_button = (FRONTEND / "components/indicare/orb/orb-button.tsx").read_text(encoding="utf-8")
    assert ".orb-overlay-shell" in css
    assert "pointer-events: none" in css
    assert "orb-floating-dock" in css
    assert "pointer-events-auto" in orb_button or "pointer-events: auto" in css
