from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_operational_orb_rail_is_shared_component():
    path = FRONTEND / "components" / "orb-operational" / "operational-orb-rail.tsx"
    text = path.read_text(encoding="utf-8")
    assert "ORB on shift" in text
    assert "Open ORB with this context" in text
    assert "/assistant/orb" in text
    assert text.count("Open ORB with this context") == 1


def test_contextual_panel_delegates_to_rail():
    panel = (FRONTEND / "components" / "indicare" / "operational" / "contextual-orb-panel.tsx").read_text(
        encoding="utf-8"
    )
    assert "OperationalOrbRail" in panel
    assert "OrbCompanionPanel" not in panel
    assert "shouldShowShellContextualOrbPanel" in panel


def test_inline_orb_support_hidden_when_rail_route():
    for rel in (
        "components/handover/handover-orb-support.tsx",
        "components/inspection-readiness/inspection-orb-support.tsx",
        "components/reg45/reg45-orb-support.tsx",
        "components/intelligence-sccif/sccif-orb-support.tsx",
    ):
        text = (FRONTEND / rel).read_text(encoding="utf-8")
        assert "shouldShowInlineOrbCard" in text
