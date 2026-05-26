from __future__ import annotations

from pathlib import Path

DOC = Path(__file__).resolve().parents[1] / "docs" / "indicare-os-north-star-product-alignment.md"


def test_north_star_doc_exists():
    assert DOC.is_file()


def test_north_star_doc_covers_required_sections():
    text = DOC.read_text(encoding="utf-8")
    for heading in (
        "What IndiCare OS is",
        "What IndiCare OS is not",
        "Child-centred operating model",
        "One record, many uses",
        "ORB as quiet copilot",
        "Form lifecycle",
        "Approval queue model",
        "Reg 44 / Ofsted readiness model",
        "Patterns and trends model",
        "Menu philosophy",
        "Legacy feature preservation",
        "UI principles",
        "Remaining limitations",
    ):
        assert heading in text


def test_north_star_quiet_copilot_phrase():
    text = DOC.read_text(encoding="utf-8")
    assert "quiet copilot" in text.lower()
    assert "/assistant/orb" in text
    assert "/orb" in text
