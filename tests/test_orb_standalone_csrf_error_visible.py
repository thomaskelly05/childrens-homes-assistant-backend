from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"
AUTH_API = REPO_ROOT / "frontend-next" / "lib" / "auth" / "api.ts"


def test_csrf_session_security_copy():
    auth = AUTH_API.read_text(encoding="utf-8")
    assert "Your session security check failed. Please refresh and try again." in auth
    client = CLIENT.read_text(encoding="utf-8")
    assert "STANDALONE_ORB_CSRF_REFRESH_MESSAGE" in client
    assert "csrfFailed" in client
    assert "parseStandaloneOrbSendError" in client


def test_companion_uses_structured_csrf_error():
    text = COMPANION.read_text(encoding="utf-8")
    assert "parseStandaloneOrbSendError" in text
    assert "STANDALONE_ORB_CSRF_REFRESH_MESSAGE" in text
    assert "parsed.csrfFailed" in text
