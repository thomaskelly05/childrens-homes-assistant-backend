from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"


def test_standalone_client_exports_retryable_network_helper():
    text = CLIENT.read_text(encoding="utf-8")
    assert "export function isStandaloneOrbRetryableNetworkError" in text
    assert "parsed.status === 0 || parsed.status === 504" in text
    assert "if (parsed.csrfFailed) return false" in text
