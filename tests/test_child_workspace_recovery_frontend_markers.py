from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
FRONTEND = REPO / "frontend-next"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_unknown_workspace_card_fallback_marker():
    assert 'data-testid="unknown-workspace-card"' in _read(
        FRONTEND / "components" / "indicare" / "workspaces" / "unknown-workspace-card.tsx"
    )


def test_database_busy_recovery_panel_marker():
    panel = _read(FRONTEND / "components" / "indicare" / "workspaces" / "workspace-recovery-panel.tsx")
    assert "Database busy" in panel or "database busy" in panel.lower()
    assert "Workspace recovery required" in panel


def test_active_child_detects_503_db_busy():
    ctx = _read(FRONTEND / "lib" / "context" / "active-child-context.tsx")
    assert "response.status === 503" in ctx
    assert "Database busy" in ctx


def test_app_shell_shows_recovery_panel_for_db_busy():
    shell = _read(FRONTEND / "components" / "indicare" / "app-shell.tsx")
    assert "WorkspaceRecoveryPanel" in shell
    assert "database busy" in shell.lower()
