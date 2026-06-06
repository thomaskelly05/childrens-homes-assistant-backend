from __future__ import annotations

import os
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
FRONTEND = REPO / "frontend-next"

SECRET_NAMES = (
    "OPENAI_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "SESSION_SECRET",
    "JWT_SECRET",
    "AUTH_SECRET",
    "GOOGLE_CLIENT_SECRET",
    "MICROSOFT_CLIENT_SECRET",
    "APPLE_PRIVATE_KEY",
    "ELEVENLABS_API_KEY",
    "DATABASE_URL",
)

ALLOWED_PATH_FRAGMENTS = (
    "/docs/",
    "/tests/",
    ".env.example",
    "orb-secrets-management-checklist",
    "orb-upgrade-screen",
)


def _iter_frontend_source_files():
    for path in FRONTEND.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix not in {".ts", ".tsx", ".js", ".jsx", ".json"}:
            continue
        if "node_modules" in path.parts or ".next" in path.parts:
            continue
        yield path


def test_no_server_secret_assignments_in_frontend_source():
    violations: list[str] = []
    for path in _iter_frontend_source_files():
        rel = str(path.relative_to(REPO))
        if any(fragment in rel for fragment in ALLOWED_PATH_FRAGMENTS):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for name in SECRET_NAMES:
            if f"{name}=" in text or f'process.env.{name}' in text:
                violations.append(f"{rel}: references {name}")
    assert not violations, "\n".join(violations)


def test_config_diagnostics_do_not_echo_secret_values(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "super-secret-test-key")
    from services.ai_provider_registry import ai_provider_registry

    payload = ai_provider_registry.health_payload()
    dumped = str(payload)
    assert "super-secret-test-key" not in dumped


@pytest.mark.parametrize("name", SECRET_NAMES)
def test_secret_names_documented_in_checklist(name):
    checklist = (REPO / "docs" / "orb-secrets-management-checklist.md").read_text(encoding="utf-8")
    assert name in checklist
