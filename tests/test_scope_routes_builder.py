from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCOPE_ROUTES = REPO_ROOT / "frontend-next" / "lib" / "navigation" / "scope-routes.ts"


def _read() -> str:
    return SCOPE_ROUTES.read_text(encoding="utf-8")


def test_scope_routes_file_exists():
    assert SCOPE_ROUTES.is_file()


def test_child_helpers_use_child_id_not_os_paths():
    text = _read()
    assert "export function childDailyNoteHref" in text
    assert "child_id" in text and "recordHref" in text
    assert "/young-people/${enc(childId)}/chronology" in text or "childPath(childId, 'chronology')" in text
    assert 'href: "/os/young-people' not in text
    assert "`/os/young-people" not in text


def test_home_helpers_use_home_id():
    text = _read()
    assert "export function homeRecordingAlertsHref" in text
    assert "home_id=" in text
    assert "/homes/${enc(homeId)}/workspace" in text or "homePath(homeId, 'workspace')" in text


def test_orb_helpers_use_assistant_orb_only():
    text = _read()
    assert "return `/assistant/orb?" in text or "return qs ? `/assistant/orb?" in text
    assert 'href: "/orb"' not in text
    assert "child_name=" not in text
    assert "draft" not in text.lower() or "draftId" in text


def test_workflow_href_maps():
    text = _read()
    assert "CHILD_WORKSPACE_WORKFLOW_HREFS" in text
    assert "HOME_WORKSPACE_WORKFLOW_HREFS" in text
    child_exports = re.findall(r"export function child(\w+)Href", text)
    assert len(child_exports) >= 20
    home_exports = re.findall(r"export function home(\w+)Href", text)
    assert len(home_exports) >= 12
