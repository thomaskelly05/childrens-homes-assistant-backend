from __future__ import annotations

from pathlib import Path

COPY = Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "intelligence" / "patterns-trends-copy.ts"
RISK_PAGE = (
    Path(__file__).resolve().parents[1] / "frontend-next" / "app" / "young-people" / "[id]" / "risk-intelligence" / "page.tsx"
)


def test_patterns_trends_copy_module():
    text = COPY.read_text(encoding="utf-8")
    assert "action_needed" in text
    assert "Improving" in text
    assert "Action needed" in text


def test_risk_intelligence_uses_action_needed_language():
    page = RISK_PAGE.read_text(encoding="utf-8")
    assert "action needed" in page.lower() or "improving" in page.lower()
