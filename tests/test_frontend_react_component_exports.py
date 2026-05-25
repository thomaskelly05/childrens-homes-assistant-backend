from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
FRONTEND = REPO / "frontend-next"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_workspace_component_registry_has_no_undefined_entries():
    registry = _read(FRONTEND / "lib" / "indicare" / "workspace-card-registry.ts")
    icons = _read(FRONTEND / "components" / "command-centre" / "care-hub-action-icons.ts")
    assert "listUndefinedWorkspaceComponents" in registry
    assert "CARE_HUB_ACTION_ICONS" in registry
    assert "'Safeguarding concern'" in icons


def test_care_hub_hero_icons_include_safeguarding_concern():
    icons = _read(FRONTEND / "components" / "command-centre" / "care-hub-action-icons.ts")
    assert "'Safeguarding concern'" in icons
    assert "careHubActionIcon" in icons


def test_care_hub_start_hero_uses_safe_icon():
    hero = _read(FRONTEND / "components" / "command-centre" / "care-hub-start-hero.tsx")
    assert "SafeLucideIcon" in hero
    assert "careHubActionIcon" in hero
    assert "iconByLabel" not in hero


def test_command_centre_cards_export_correctly():
    for rel in [
        "components/command-centre/care-hub-attention-strip.tsx",
        "components/command-centre/intelligence-actions-card.tsx",
        "components/connect/notification-bell.tsx",
    ]:
        source = _read(FRONTEND / rel)
        assert "export function" in source or "export async function" in source


def test_workspace_recovery_and_unknown_card_exports():
    unknown = _read(FRONTEND / "components" / "indicare" / "workspaces" / "unknown-workspace-card.tsx")
    recovery = _read(FRONTEND / "components" / "indicare" / "workspaces" / "workspace-recovery-panel.tsx")
    assert 'data-testid="unknown-workspace-card"' in unknown
    assert 'data-testid="workspace-recovery-panel"' in recovery
