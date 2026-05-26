from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_operational_orb_mobile_layout():
    page = (FRONTEND / "app/assistant/orb/operational-orb-page.tsx").read_text(encoding="utf-8")
    chat = (FRONTEND / "components/orb-operational/orb-conversation-experience.tsx").read_text(encoding="utf-8")
    assert 'data-testid="orb-operational-mobile-layout"' in page
    assert 'data-testid="orb-operational-message-form"' in chat
    assert 'data-testid="orb-operational-send-button"' in chat
    assert "orb-operational-composer" in chat
    assert "safe-area-inset-bottom" in chat or "safe-area-inset-bottom" in page
