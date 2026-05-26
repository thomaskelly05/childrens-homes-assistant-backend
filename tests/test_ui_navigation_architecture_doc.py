from __future__ import annotations

from pathlib import Path

DOC = Path(__file__).resolve().parents[1] / "docs" / "indicare-ui-navigation-architecture.md"


def test_ui_navigation_architecture_doc_exists():
    assert DOC.is_file()


def test_main_menu_headings_documented():
    text = DOC.read_text(encoding="utf-8")
    for heading in (
        "Home",
        "Children",
        "Adults / Staff",
        "Records",
        "Safeguarding",
        "Plans",
        "Reports",
        "Governance",
        "Regulation",
        "ORB",
        "Settings",
    ):
        assert heading in text


def test_scope_menus_documented():
    text = DOC.read_text(encoding="utf-8")
    assert "Child scope sidebar" in text
    assert "Home scope sidebar" in text
    assert "navigation-rescue" in text.lower() or "Navigation rescue" in text
