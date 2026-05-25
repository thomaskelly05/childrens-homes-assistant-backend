from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_PAGE = REPO_ROOT / "frontend-next" / "app" / "young-people" / "[id]" / "workspace" / "page.tsx"
SYNC_SCOPE = REPO_ROOT / "frontend-next" / "components" / "indicare" / "scope" / "sync-child-scope.tsx"


def test_child_workspace_sync_scope_component_exists():
    assert SYNC_SCOPE.is_file()
    assert WORKSPACE_PAGE.is_file()


def test_child_workspace_sets_scope_markers():
    page = WORKSPACE_PAGE.read_text(encoding="utf-8")
    sync = SYNC_SCOPE.read_text(encoding="utf-8")
    assert "SyncChildScope" in page
    assert "applyScopeSelection" in sync
    assert "scope_type: 'child'" in sync
    assert "/assistant/orb" in (REPO_ROOT / "frontend-next" / "lib" / "navigation" / "scope-navigation.ts").read_text(encoding="utf-8")
    assert "standalone /orb" not in sync.lower()
    assert "redirect(" not in page
