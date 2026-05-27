from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"


def test_standalone_client_exports_retryable_network_helper():
    text = CLIENT.read_text(encoding="utf-8")
    assert "export function isStandaloneOrbRetryableNetworkError" in text
    assert "parsed.status === 0 || parsed.status === 504" in text
    assert "if (parsed.csrfFailed) return false" in text


def test_care_companion_retries_retryable_first_send_after_session_refresh():
    companion = (REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx").read_text(
        encoding="utf-8"
    )
    assert "isStandaloneOrbRetryableNetworkError(firstError)" in companion
    assert "retryable first-send failure" in companion
    assert "await refreshSession()" in companion
    assert "runConversationRequest()" in companion
