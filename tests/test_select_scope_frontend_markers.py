from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SELECTOR = REPO_ROOT / "frontend-next" / "components" / "indicare" / "scope" / "home-child-selector.tsx"
OS_SCOPE = REPO_ROOT / "frontend-next" / "lib" / "os-scope.ts"
AUTH_API = REPO_ROOT / "frontend-next" / "lib" / "auth" / "api.ts"


def test_selector_includes_credentials_include():
    assert "credentials: 'include'" in AUTH_API.read_text(encoding="utf-8")


def test_selector_degraded_retry_marker():
    text = SELECTOR.read_text(encoding="utf-8")
    assert 'data-testid="select-scope-degraded-panel"' in text
    assert 'data-testid="select-scope-retry"' in text
    assert "Retry" in text


def test_no_current_home_label_without_selected_home_id():
    text = SELECTOR.read_text(encoding="utf-8")
    assert "Current home" not in text
    assert "select-scope-current-home-label" in text
    assert "hasSelectedHome" in text


def test_children_hint_before_home_selected():
    text = SELECTOR.read_text(encoding="utf-8")
    assert "Select a home to load children" in text
    assert 'data-testid="select-scope-children-hint"' in text


def test_homes_you_can_access_label():
    text = SELECTOR.read_text(encoding="utf-8")
    assert "Homes you can access" in text
    assert 'data-testid="select-scope-homes-label"' in text


def test_empty_homes_linked_account_message():
    text = SELECTOR.read_text(encoding="utf-8")
    assert "No homes are linked to your account" in text
    assert 'data-testid="select-scope-no-homes"' in text


def test_choose_another_home_control():
    text = SELECTOR.read_text(encoding="utf-8")
    assert "Choose another home" in text
    assert 'data-testid="select-scope-choose-another-home"' in text


def test_os_scope_normalises_children_arrays():
    text = OS_SCOPE.read_text(encoding="utf-8")
    assert "available_children" in text
    assert "normaliseScopeState" in text


def test_workspace_href_never_uses_undefined_ids():
    text = OS_SCOPE.read_text(encoding="utf-8")
    assert "selected_child_id" in text
    assert "selected_home_id" in text
    assert "childWorkspaceHref" in text
    routes = (REPO_ROOT / "frontend-next" / "lib" / "navigation" / "child-workspace-routes.ts").read_text(encoding="utf-8")
    assert "/os/young-people/" in routes
    assert "undefined" not in text.split("workspaceHrefForScope")[1].split("export")[0]
