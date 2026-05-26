from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_mobile_os_workspace_padding_class():
    shell = (FRONTEND / "lib/navigation/mobile-shell.ts").read_text(encoding="utf-8")
    assert "pb-[calc(7rem+env(safe-area-inset-bottom))]" in shell


def test_globals_mobile_workspace_padding():
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    assert ".mobile-os-workspace" in css
    assert "padding-bottom: calc(7rem + env(safe-area-inset-bottom))" in css
    assert ".mobile-child-workspace" in css
    assert ".mobile-home-workspace" in css


def test_app_shell_applies_mobile_os_workspace():
    app = (FRONTEND / "components/indicare/app-shell.tsx").read_text(encoding="utf-8")
    assert "mobile-os-workspace" in app
    assert "mobileWorkspaceBottomPaddingClass" in app
