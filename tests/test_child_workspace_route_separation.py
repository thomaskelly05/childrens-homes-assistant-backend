from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"
ROUTES = FRONTEND / "lib" / "navigation" / "child-workspace-routes.ts"
SELECTOR = FRONTEND / "components" / "indicare" / "scope" / "home-child-selector.tsx"
APP_SHELL = FRONTEND / "components" / "indicare" / "app-shell.tsx"
SCOPE_NAV = FRONTEND / "lib" / "navigation" / "scope-navigation.ts"
GATE = FRONTEND / "components" / "indicare" / "scope" / "os-scope-gate.tsx"
SYNC = FRONTEND / "components" / "indicare" / "scope" / "sync-child-scope.tsx"
WORKSPACE_PAGE = FRONTEND / "app" / "young-people" / "[id]" / "workspace" / "page.tsx"
OS_WORKSPACE_PAGE = FRONTEND / "app" / "os" / "young-people" / "[id]" / "workspace" / "page.tsx"
NEXT_CONFIG = FRONTEND / "next.config.ts"


def test_child_workspace_href_is_frontend_page_route():
    text = ROUTES.read_text(encoding="utf-8")
    assert "export function childWorkspaceHref" in text
    assert "/young-people/${encodeURIComponent(String(childId))}/workspace" in text.replace(" ", "")
    href_body = text.split("export function childWorkspaceHref")[1].split("export function")[0]
    assert "return" in href_body
    assert href_body.index("/young-people/") < href_body.index("return") + 200
    assert "`/os/" not in href_body.split("return", 1)[1].split("\n")[0]


def test_child_workspace_api_href_is_backend_route():
    text = ROUTES.read_text(encoding="utf-8")
    assert "export function childWorkspaceApiHref" in text
    assert "/os/young-people/${encodeURIComponent(String(childId))}/workspace" in text.replace(" ", "")


def test_is_child_workspace_page_matches_frontend_only():
    text = ROUTES.read_text(encoding="utf-8")
    assert "isChildWorkspacePage" in text
    assert "isChildWorkspaceApiPath" in text
    page_fn = text.split("export function isChildWorkspacePage")[1].split("export function")[0]
    api_fn = text.split("export function isChildWorkspaceApiPath")[1].split("export function")[0]
    assert "young-people" in page_fn
    assert "'os'" in api_fn or '"os"' in api_fn


def test_next_config_proxies_os_namespace_to_backend():
    text = NEXT_CONFIG.read_text(encoding="utf-8")
    assert "/os/:path*" in text
    assert "destination:" in text


def test_frontend_os_workspace_page_removed():
    assert not OS_WORKSPACE_PAGE.is_file()


def test_young_people_workspace_page_renders_ui_not_redirect():
    text = WORKSPACE_PAGE.read_text(encoding="utf-8")
    assert "redirect(" not in text
    assert "SyncChildScope" in text
    assert "RecordWorkspacePage" in text
    assert "getOsYoungPersonWorkspace" in text


def test_selector_does_not_push_os_workspace_route():
    text = SELECTOR.read_text(encoding="utf-8")
    assert "router.push(href)" in text
    assert "childWorkspaceHref" in text
    assert "/os/young-people" not in text


def test_appshell_child_overview_uses_frontend_href():
    text = APP_SHELL.read_text(encoding="utf-8")
    assert "childWorkspaceHref" in text
    shell_child_links = re.findall(r"childWorkspaceHref\([^)]+\)", text)
    assert shell_child_links
    assert "/os/young-people" not in text.split("childWorkspaceHref")[1][:400]


def test_scope_navigation_child_overview_uses_frontend_href():
    text = SCOPE_NAV.read_text(encoding="utf-8")
    child_nav = text.split("export function childScopeNavigation")[1].split("export function")[0]
    assert "childWorkspaceHref" in child_nav
    assert "/os/young-people" not in child_nav


def test_os_scope_gate_uses_frontend_page_detector():
    text = GATE.read_text(encoding="utf-8")
    assert "isChildWorkspacePage" in text
    assert "isChildWorkspaceApiPath" not in text
    assert 'router.replace("/os/young-people' not in text
    assert "router.push('/os/young-people" not in text


def test_sync_child_scope_does_not_navigate_to_os_route():
    text = SYNC.read_text(encoding="utf-8")
    assert "router.push" not in text
    assert "router.replace" not in text
    assert "/os/young-people" not in text
