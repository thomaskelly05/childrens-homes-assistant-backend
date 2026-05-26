from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_appshell_preserves_interactive_markers():
    shell = (FRONTEND / "components/indicare/app-shell.tsx").read_text(encoding="utf-8")
    assert "logout-button" in shell
    assert "sidebar-orb-link" in shell
    assert "MobileBottomNav" in shell
    assert "MobileOsTopBar" in shell
    assert 'href="/assistant/orb"' in shell


def test_hydration_diagnostic_in_providers():
    providers = (FRONTEND / "components/indicare/scope/os-app-providers.tsx").read_text(encoding="utf-8")
    assert "HydrationDiagnostic" in providers


def test_navigation_rescue_loaded_globally_from_root_layout():
    layout = (FRONTEND / "app/layout.tsx").read_text(encoding="utf-8")
    assert "NavigationRescue" in layout
    assert "<NavigationRescue" in layout
