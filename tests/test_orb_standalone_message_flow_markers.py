from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
COMPOSER = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-composer.tsx"


def test_message_flow_test_ids():
    companion = COMPANION.read_text(encoding="utf-8")
    for marker in (
        'data-testid="orb-message-user"',
        'data-testid="orb-message-assistant"',
        'data-testid="orb-message-thinking"',
        'data-testid="orb-message-error"',
        'data-testid="orb-message-retry"',
        'data-testid="orb-send-error"',
    ):
        assert marker in companion, marker


def test_composer_pending_and_send_status_markers():
    text = COMPOSER.read_text(encoding="utf-8")
    assert 'data-pending={pending ? \'true\' : \'false\'}' in text
    assert "data-last-send-status={lastSendStatus}" in text
    assert "lastSendStatus" in text
