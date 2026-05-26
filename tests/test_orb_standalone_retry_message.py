from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"


def test_retry_strips_placeholders_and_refreshes_session():
    text = COMPANION.read_text(encoding="utf-8")
    assert "stripTrailingTurnPlaceholders" in text
    assert "options?.retry" in text
    assert "await refreshSession()" in text
    assert "retry: true" in text
    assert "retryPayload.chatId" in text


def test_retry_button_markers():
    text = COMPANION.read_text(encoding="utf-8")
    assert 'data-testid="orb-message-retry"' in text
