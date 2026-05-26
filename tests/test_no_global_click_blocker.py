from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_orb_button_uses_overlay_shell_classes():
    text = (FRONTEND / "components/indicare/orb/orb-button.tsx").read_text(encoding="utf-8")
    assert "orb-overlay-shell" in text
    assert "orb-overlay-interactive" in text


def test_globals_define_overlay_pointer_events():
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    assert ".orb-overlay-shell" in css
    assert ".orb-overlay-interactive" in css
    assert ".orb-screen-edge-pulse" in css
    pulse_section = css.split(".orb-screen-edge-pulse")[1][:200]
    assert "pointer-events: none" in pulse_section


def test_operational_rail_not_fixed_inset_overlay():
    text = (FRONTEND / "components/orb-operational/operational-orb-rail.tsx").read_text(encoding="utf-8")
    assert "fixed inset-0" not in text
    assert "operational-orb-rail" in text or "OperationalOrbRail" in text


def test_floating_orb_hidden_on_assistant_orb():
    rules = (FRONTEND / "lib" / "orb" / "orb-presence-rules.ts").read_text(encoding="utf-8")
    assert "/assistant/orb" in rules
    shell = (FRONTEND / "components/indicare/app-shell.tsx").read_text(encoding="utf-8")
    assert "shouldShowFloatingOrb" in shell
