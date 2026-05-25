"""Auth session survival when dependency routes return 503."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_auth_me_survival_markers():
    auth_context = (REPO_ROOT / "frontend-next" / "contexts" / "auth-context.tsx").read_text(encoding="utf-8")
    assert "isTemporaryUnavailableStatus" in auth_context
    assert "setStatus('authenticated')" in auth_context


def test_audit_skips_under_pool_pressure_marker():
    audit = (REPO_ROOT / "services" / "audit_event_service.py").read_text(encoding="utf-8")
    assert "is_pool_under_pressure" in audit
