from __future__ import annotations

from pathlib import Path

HOME_PAGE = Path(__file__).resolve().parents[1] / "frontend-next" / "app" / "homes" / "[id]" / "workspace" / "page.tsx"


def test_home_workspace_grouped_sections():
    page = HOME_PAGE.read_text(encoding="utf-8")
    assert "home-workspace-section-today" in page
    assert "home-workspace-section-safeguarding" in page
    assert "home-workspace-section-workforce" in page
    assert "home-workspace-section-inspection" in page
    assert "home-workspace-section-more" in page


def test_home_workspace_hero_actions():
    page = HOME_PAGE.read_text(encoding="utf-8")
    assert "home-hero-daily-brief" in page
    assert "home-hero-handover" in page
    assert "home-workspace-priority-count" in page


def test_home_today_section_copy():
    page = HOME_PAGE.read_text(encoding="utf-8")
    assert "Home today" in page
