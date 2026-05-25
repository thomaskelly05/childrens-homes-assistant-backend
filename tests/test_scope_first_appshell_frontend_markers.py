from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
APP_SHELL = REPO_ROOT / "frontend-next" / "components" / "indicare" / "app-shell.tsx"
SCOPE_NAV = REPO_ROOT / "frontend-next" / "lib" / "navigation" / "scope-navigation.ts"
OS_SCOPE = REPO_ROOT / "frontend-next" / "lib" / "os-scope.ts"
LAYOUT = REPO_ROOT / "frontend-next" / "app" / "layout.tsx"
OS_APP_PROVIDERS = REPO_ROOT / "frontend-next" / "components" / "indicare" / "scope" / "os-app-providers.tsx"


def test_scope_first_files_exist():
    for path in (APP_SHELL, SCOPE_NAV, OS_SCOPE, LAYOUT):
        assert path.is_file(), f"missing {path}"


def test_appshell_no_scope_does_not_mount_heavy_dashboard_fetch_markers():
    text = APP_SHELL.read_text(encoding="utf-8")
    assert "useOsScope" in text
    assert "scope-navigation" in text
    assert "hasOsScope" in text
    assert "/api/governance-os/command-centre" not in text
    assert "NotificationBell" in text
    assert "hasOsScope && scope.scope_type === 'child' ? <NotificationBell />" in text.replace("\n", " ") or (
        "hasOsScope && scope.scope_type === 'child' ? <NotificationBell />" in text
    )


def test_appshell_child_scope_menu_markers():
    nav = SCOPE_NAV.read_text(encoding="utf-8")
    child_nav = nav.split("export function childScopeNavigation")[1].split("export function")[0]
    for marker in (
        "childScopeNavigation",
        "Child overview",
        "Chronology",
        "ORB for this child",
        "/assistant/orb?context=child",
    ):
        assert marker in nav
    assert "childWorkspaceHref" in child_nav
    assert "/os/young-people" not in child_nav


def test_appshell_home_scope_menu_markers():
    nav = SCOPE_NAV.read_text(encoding="utf-8")
    for marker in (
        "homeScopeNavigation",
        "Home workspace",
        "Recording alerts",
        "ORB for this home",
    ):
        assert marker in nav


def test_layout_wraps_scope_provider_and_gate():
    layout = LAYOUT.read_text(encoding="utf-8")
    providers = OS_APP_PROVIDERS.read_text(encoding="utf-8")
    assert "OsAppProviders" in layout
    assert "OsScopeProvider" in providers
    assert "OsScopeGate" in providers


def test_appshell_no_scope_safety_guards():
    text = APP_SHELL.read_text(encoding="utf-8")
    assert "scopeHasValidIds" in text
    assert "scope_type === 'none'" in text or "scope.scope_type" in text
    assert "noScopeNavigation" in text
    assert "undefined" in text
    assert "isSelectScopeRoute" in text
