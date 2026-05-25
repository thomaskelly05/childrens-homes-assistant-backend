from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"
OS_SCOPE = FRONTEND / "lib" / "os-scope.ts"
ROUTES = FRONTEND / "lib" / "navigation" / "child-workspace-routes.ts"
SELECTOR = FRONTEND / "components" / "indicare" / "scope" / "home-child-selector.tsx"
GATE = FRONTEND / "components" / "indicare" / "scope" / "os-scope-gate.tsx"
SYNC = FRONTEND / "components" / "indicare" / "scope" / "sync-child-scope.tsx"
APP_SHELL = FRONTEND / "components" / "indicare" / "app-shell.tsx"
LOADING = FRONTEND / "components" / "indicare" / "scope" / "child-workspace-loading-fallback.tsx"
CANONICAL_PAGE = FRONTEND / "app" / "os" / "young-people" / "[id]" / "workspace" / "page.tsx"
OS_SCOPE_SERVICE = REPO_ROOT / "services" / "os_scope_service.py"


def test_child_workspace_href_canonical():
    text = ROUTES.read_text(encoding="utf-8")
    assert "childWorkspaceHref" in text
    assert "/os/young-people/${encodeURIComponent(String(childId))}/workspace" in text.replace(" ", "")


def test_selector_navigates_to_canonical_route():
    text = SELECTOR.read_text(encoding="utf-8")
    assert "childWorkspaceHref" in text
    assert "router.push(href)" in text
    assert "openingChildId" in text
    assert "navigateTimedOut" in text
    assert "Workspace is taking longer than expected" in text


def test_no_legacy_workspace_href_in_scope_fallback():
    text = OS_SCOPE.read_text(encoding="utf-8")
    assert "childWorkspaceHref" in text
    workspace_fn = text.split("export function workspaceHrefForScope")[1].split("export function")[0]
    assert "/young-people/${scope.selected_child_id}/workspace" not in workspace_fn


def test_os_scope_gate_skips_redirect_on_canonical_child_workspace():
    text = GATE.read_text(encoding="utf-8")
    assert "isAlreadyOnScopedChildWorkspace" in text
    assert "lastRedirectRef" in text
    assert "target === pathname" in text


def test_sync_child_scope_dedupes_when_scope_matches():
    text = SYNC.read_text(encoding="utf-8")
    assert "lastSyncedChildIdRef" in text
    assert "syncInFlightRef" in text
    assert "scopeMatches" in text
    assert "router.refresh" not in text
    assert "router.replace" not in text


def test_canonical_next_page_exists():
    assert CANONICAL_PAGE.is_file()
    page = CANONICAL_PAGE.read_text(encoding="utf-8")
    assert "SyncChildScope" in page
    assert "getOsYoungPersonWorkspace" in page


def test_legacy_young_people_workspace_redirects():
    legacy = FRONTEND / "app" / "young-people" / "[id]" / "workspace" / "page.tsx"
    text = legacy.read_text(encoding="utf-8")
    assert "redirect(childWorkspaceHref" in text.replace(" ", "")


def test_loading_fallback_timeout_and_buttons():
    text = LOADING.read_text(encoding="utf-8")
    assert "TIMEOUT_MS = 5000" in text
    assert "child-workspace-open-direct" in text
    assert "child-workspace-back-select-scope" in text
    assert "Workspace is taking longer than expected" in text


def test_appshell_uses_loading_fallback_component():
    text = APP_SHELL.read_text(encoding="utf-8")
    assert "ChildWorkspaceLoadingFallback" in text
    assert "scopeHasValidIds" in text


def test_backend_scope_child_workspace_route_canonical():
    text = OS_SCOPE_SERVICE.read_text(encoding="utf-8")
    assert 'routes.child_workspace = f"/os/young-people/{child_id}/workspace"' in text
