from __future__ import annotations

from pathlib import Path

PAGE = Path(__file__).resolve().parents[1] / "frontend-next" / "app" / "homes" / "[id]" / "workspace" / "page.tsx"


def test_home_workspace_sections():
    text = PAGE.read_text(encoding="utf-8")
    for section in (
        "home-workspace-section-today",
        "home-workspace-section-safeguarding",
        "home-workspace-section-workforce",
        "home-workspace-section-inspection",
        "home-workspace-section-more",
    ):
        assert section in text


def test_home_workspace_route_hints():
    text = PAGE.read_text(encoding="utf-8")
    assert "home-workspace-incidents-hint" in text
    assert "home-workspace-missing-hint" in text
    assert "home-workspace-supervision-hint" in text
    assert "HOME_LINK_PURPOSE" in text


def test_home_workspace_single_orb_rail():
    text = PAGE.read_text(encoding="utf-8")
    assert text.count("<OperationalOrbRail") == 1
    assert "home-workspace-orb-rail" in text
