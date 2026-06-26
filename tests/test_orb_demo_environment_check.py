"""ORB demo environment check — non-destructive inspection contracts."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from services.orb_demo_environment_service import (
    ORB_MIGRATION_FILES,
    run_demo_environment_checks,
)

ROOT = Path(__file__).resolve().parents[1]


def test_demo_environment_script_exists():
    script = ROOT / "scripts" / "check_orb_demo_environment.py"
    assert script.is_file()
    text = script.read_text(encoding="utf-8")
    assert "run_demo_environment_checks" in text
    assert "_load_env_readonly" in text


def test_demo_readiness_runbook_exists():
    doc = ROOT / "docs" / "deployment" / "orb-demo-readiness-runbook.md"
    assert doc.is_file()
    text = doc.read_text(encoding="utf-8")
    assert "check_orb_demo_environment.py" in text
    assert "MFA" in text
    assert "safety" in text.lower()


def test_orb_migration_file_list_covers_demo_range():
    names = [path.name for path in ORB_MIGRATION_FILES]
    assert names[0] == "200_orb_residential_premium.sql"
    assert names[-1] == "211_orb_home_documents.sql"
    assert len(names) == 13


def test_demo_environment_report_structure(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("SESSION_SECRET", raising=False)
    report = run_demo_environment_checks(probe_services=False)
    data = report.to_dict()
    assert "checks" in data
    assert "ready_for_demo" in data
    assert "next_steps" in data
    assert any(c["id"] == "env_file" for c in data["checks"])
    assert any(c["id"] == "orb_migration_files" for c in data["checks"])


def test_demo_environment_flags_placeholder_openai(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@127.0.0.1:5432/test")
    monkeypatch.setenv("SESSION_SECRET", "local-dev-secret-value")
    monkeypatch.setenv("OPENAI_API_KEY", "replace-with-openai-key")
    report = run_demo_environment_checks(probe_services=False)
    openai = next(c for c in report.checks if c.id == "env_openai_api_key")
    assert openai.status == "concern"


def test_demo_environment_does_not_require_running_services(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@127.0.0.1:9/test")
    monkeypatch.setenv("SESSION_SECRET", "local-dev-secret-value")
    report = run_demo_environment_checks(probe_services=False)
    backend = next(c for c in report.checks if c.id == "backend_health")
    frontend = next(c for c in report.checks if c.id == "frontend_http")
    assert backend.status == "skip"
    assert frontend.status == "skip"
