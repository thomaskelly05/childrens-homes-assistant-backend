from __future__ import annotations

from pathlib import Path

from tests.full_system_qa_helpers import FRONTEND, REPO_ROOT, read

ROOT_PAGE = FRONTEND / "app" / "page.tsx"
SELECT_SCOPE = FRONTEND / "app" / "select-scope" / "page.tsx"
SELECT_CLIENT = FRONTEND / "components" / "indicare" / "scope" / "select-scope-client.tsx"
SCOPE_PROVIDER = FRONTEND / "components" / "indicare" / "scope" / "os-scope-provider.tsx"
HOME_WORKSPACE = FRONTEND / "app" / "homes" / "[id]" / "workspace" / "page.tsx"
CHILD_WORKSPACE = FRONTEND / "app" / "young-people" / "[id]" / "workspace" / "page.tsx"
HANDOVER_CURRENT = FRONTEND / "app" / "handover" / "current" / "page.tsx"
SHIFTS_CURRENT = FRONTEND / "app" / "shifts" / "current" / "page.tsx"


def test_root_redirects_to_select_scope():
    text = read(ROOT_PAGE)
    assert 'redirect("/select-scope")' in text or "redirect('/select-scope')" in text


def test_select_scope_page_marker():
    text = read(SELECT_SCOPE)
    assert "data-testid=\"select-scope-page\"" in text
    assert "SelectScopeClient" in text


def test_home_and_child_workspace_pages_exist():
    assert HOME_WORKSPACE.is_file()
    assert CHILD_WORKSPACE.is_file()
    assert "data-testid=\"home-workspace-page\"" in read(HOME_WORKSPACE)
    assert "data-testid=\"child-workspace-overview-page\"" in read(
        FRONTEND / "components" / "young-people" / "workspace" / "child-workspace-overview.tsx"
    )


def test_scope_provider_preserves_auth_on_503():
    text = read(SCOPE_PROVIDER)
    assert "503" in text
    assert "hydrateScopeFromStorage" in text
    assert "degraded" in text


def test_handover_current_avoids_command_centre_preload():
    text = read(HANDOVER_CURRENT)
    assert "getCommandCentre" not in text


def test_shifts_current_scoped_branch_skips_command_centre():
    text = read(SHIFTS_CURRENT)
    assert "home_id" in text
    assert "shifts-current-scoped-page" in text
    scoped = text.split("if (homeId)", 1)[1].split("const commandResult", 1)[0]
    assert "getCommandCentre" not in scoped


def test_legacy_os_workspace_route_removed():
    legacy = FRONTEND / "app" / "os" / "young-people" / "[id]" / "workspace" / "page.tsx"
    assert not legacy.is_file()
