from __future__ import annotations

from pathlib import Path

OPERATIONAL_NAV = (
    Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "navigation" / "operational-navigation.ts"
)


def test_meaningful_main_menu_labels_exported():
    text = OPERATIONAL_NAV.read_text(encoding="utf-8")
    assert "MEANINGFUL_MAIN_MENU_LABELS" in text
    for label in (
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
        assert label in text


def test_operational_nav_primary_items_use_meaningful_labels():
    text = OPERATIONAL_NAV.read_text(encoding="utf-8")
    primary_block = text.split("menuGroup: 'primary'")[0]
    assert "label: 'Records'" in text
    assert "label: 'Regulation'" in text
    assert "href: '/assistant/orb'" in text
    assert "quiet copilot" in text.lower()
