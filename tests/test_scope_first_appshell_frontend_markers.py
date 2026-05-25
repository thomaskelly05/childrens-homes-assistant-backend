from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_scope_first_files_exist():
    required = [
        FRONTEND / "lib" / "navigation" / "scope-routes.ts",
        FRONTEND / "lib" / "navigation" / "scope-navigation.ts",
        FRONTEND / "lib" / "orb" / "scope-orb-context.ts",
        FRONTEND / "components" / "orb-operational" / "scope-orb-launcher.tsx",
        REPO_ROOT / "docs" / "scope-first-os-wiring-map.md",
    ]
    for path in required:
        assert path.is_file(), str(path)


def test_appshell_avoids_global_dashboard_on_mount():
    shell = (FRONTEND / "components" / "indicare" / "app-shell.tsx").read_text(encoding="utf-8")
    assert "governance-os/command-centre" not in shell
    assert "workforce-os/dashboard" not in shell


def test_scope_navigation_uses_scope_routes():
    nav = (FRONTEND / "lib" / "navigation" / "scope-navigation.ts").read_text(encoding="utf-8")
    assert "scope-routes" in nav
    assert "context=child" not in nav
    assert "context=home" not in nav
