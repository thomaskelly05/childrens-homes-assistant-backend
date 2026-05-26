from __future__ import annotations

from tests.full_system_qa_helpers import FRONTEND, HOME_WORKFLOW_KEYS, read

SCOPE_ROUTES = FRONTEND / "lib" / "navigation" / "scope-routes.ts"
HOME_PAGE = FRONTEND / "app" / "homes" / "[id]" / "workspace" / "page.tsx"


def test_home_workspace_workflow_hrefs_export_all_keys():
    text = read(SCOPE_ROUTES)
    block = text.split("HOME_WORKSPACE_WORKFLOW_HREFS", 1)[1]
    for key in HOME_WORKFLOW_KEYS:
        assert f"{key}:" in block, key


def test_home_handover_uses_scoped_handover_route():
    text = read(SCOPE_ROUTES)
    assert "/handover?home_id=" in text


def test_home_workspace_page_uses_prefetch_false():
    text = read(HOME_PAGE)
    assert "prefetch={false}" in text
    assert "home-workspace-page" in text
    assert "getCommandCentre" not in text


def test_home_intelligence_routes_include_home_id():
    text = read(SCOPE_ROUTES)
    assert "inspection-readiness?home_id=" in text
    assert "intelligence/reg45?home_id=" in text
