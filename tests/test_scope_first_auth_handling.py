from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
AUTH_CONTEXT = REPO_ROOT / "frontend-next" / "contexts" / "auth-context.tsx"
AUTH_API = REPO_ROOT / "frontend-next" / "lib" / "auth" / "api.ts"
SCOPE_PROVIDER = REPO_ROOT / "frontend-next" / "components" / "indicare" / "scope" / "os-scope-provider.tsx"


def test_auth_api_distinguishes_temporary_unavailable():
    text = AUTH_API.read_text(encoding="utf-8")
    assert "isTemporaryUnavailableStatus" in text
    assert "503" in text


def test_auth_context_preserves_session_on_503():
    text = AUTH_CONTEXT.read_text(encoding="utf-8")
    assert "isTemporaryUnavailableStatus" in text
    assert "setStatus('authenticated')" in text
    assert "isAuthFailureStatus" in text


def test_scope_provider_preserves_scope_on_503():
    text = SCOPE_PROVIDER.read_text(encoding="utf-8")
    assert "503" in text
    assert "degraded" in text
    assert "hydrateScopeFromStorage" in text
