from __future__ import annotations

from tests.full_system_qa_helpers import CHILD_WORKFLOW_KEYS, FRONTEND, read

SCOPE_ROUTES = FRONTEND / "lib" / "navigation" / "scope-routes.ts"
NORMALISER = FRONTEND / "lib" / "young-people" / "child-workspace-normaliser.ts"
OVERVIEW = FRONTEND / "components" / "young-people" / "workspace" / "child-workspace-overview.tsx"


def test_child_workspace_workflow_hrefs_export_all_keys():
    text = read(SCOPE_ROUTES)
    block = text.split("CHILD_WORKSPACE_WORKFLOW_HREFS", 1)[1].split("HOME_WORKSPACE_WORKFLOW_HREFS", 1)[0]
    for key in CHILD_WORKFLOW_KEYS:
        assert f"{key}:" in block, key


def test_child_quick_actions_use_scoped_routes():
    text = read(NORMALISER)
    assert "child-quick-daily-note" in text
    assert "child-quick-orb" in text
    assert "childOrbHref" in text
    assert "/actions?child_id=" in text


def test_child_workspace_overview_has_quick_action_links():
    text = read(OVERVIEW)
    assert "prefetch={false}" in text
    assert "child-workspace-overview-page" in text


def test_child_lifecycle_pages_exist():
    child_id = "[id]"
    for segment in ("archive", "chronology", "lifeecho", "plan-impacts"):
        page = FRONTEND / "app" / "young-people" / child_id / segment / "page.tsx"
        assert page.is_file(), segment
