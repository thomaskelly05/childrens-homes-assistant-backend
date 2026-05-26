from __future__ import annotations

from tests.full_system_qa_helpers import FRONTEND, read

SELECT_SCOPE = FRONTEND / "app" / "select-scope" / "page.tsx"
HOME_WORKSPACE = FRONTEND / "app" / "homes" / "[id]" / "workspace" / "page.tsx"
CHILD_WORKSPACE = FRONTEND / "app" / "young-people" / "[id]" / "workspace" / "page.tsx"
HANDOVER_CURRENT = FRONTEND / "app" / "handover" / "current" / "page.tsx"
QUICK_ACTIONS = FRONTEND / "components" / "indicare" / "operational" / "operational-quick-actions.tsx"
SCOPE_NAV = FRONTEND / "lib" / "navigation" / "scope-navigation.ts"


def test_select_scope_does_not_import_command_centre():
    text = read(SELECT_SCOPE) + read(FRONTEND / "components" / "indicare" / "scope" / "home-child-selector.tsx")
    assert "getCommandCentre" not in text
    assert "workforce-os/dashboard" not in text


def test_scoped_workspaces_avoid_command_centre_fetch():
    for path in (HOME_WORKSPACE, CHILD_WORKSPACE):
        assert "getCommandCentre" not in read(path)


def test_operational_quick_actions_no_care_hub_when_child_scoped():
    text = read(QUICK_ACTIONS)
    child_branch = text.split("const defaultActions = childId", 1)[1].split(": [", 1)[0]
    assert "/command-centre" not in child_branch


def test_scope_nav_no_api_dashboard_paths():
    text = read(SCOPE_NAV)
    assert "/api/governance-os" not in text
    assert "/api/workforce-os/dashboard" not in text
