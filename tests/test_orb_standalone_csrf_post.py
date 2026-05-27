from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
CLIENT = REPO / "frontend-next" / "lib" / "orb" / "standalone-client.ts"
AUTH_API = REPO / "frontend-next" / "lib" / "auth" / "api.ts"
COMPANION = REPO / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
MIDDLEWARE = REPO / "middleware" / "security_middleware.py"


def test_standalone_client_post_uses_auth_fetch_stack():
    text = CLIENT.read_text(encoding="utf-8")
    assert "authFetchResponse" in text
    assert "applyCsrfHeaders" in text
    assert "credentials: 'include'" in text
    assert "STANDALONE_ORB_API_PATHS.conversation" in text
    assert "'Content-Type': 'application/json'" in text or '"Content-Type": "application/json"' in text


def test_auth_api_sets_csrf_header_on_mutations():
    text = AUTH_API.read_text(encoding="utf-8")
    assert "applyCsrfHeaders" in text
    assert "X-CSRF-Token" in text
    assert "credentials: 'include'" in text
    assert "__Host-indicare_csrf" in text


def test_standalone_client_csrf_failure_message():
    text = CLIENT.read_text(encoding="utf-8")
    auth = AUTH_API.read_text(encoding="utf-8")
    assert "isStandaloneOrbCsrfError" in text
    assert "STANDALONE_ORB_CSRF_REFRESH_MESSAGE" in text
    assert "Your session security check failed" in auth


def test_companion_gates_send_on_csrf_ready():
    text = COMPANION.read_text(encoding="utf-8")
    assert "orbSessionReady" in text
    assert "csrfReady" in text
    assert "STANDALONE_ORB_CSRF_REFRESH_MESSAGE" in text


def test_backend_csrf_failure_payload():
    text = MIDDLEWARE.read_text(encoding="utf-8")
    assert '"detail": "csrf_failed"' in text
    assert "Session security check failed" in text
