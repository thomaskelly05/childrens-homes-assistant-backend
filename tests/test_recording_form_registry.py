from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
REGISTRY = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-registry.ts"
TYPES = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-types.ts"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_registry_file_exists():
    assert REGISTRY.is_file()


def test_registry_has_categories():
    text = _read(REGISTRY)
    for category in (
        "daily_life",
        "safeguarding_incident",
        "health_medication",
        "education_family",
        "planning_review",
        "manager_governance",
        "workforce",
        "environment",
        "documents_evidence",
    ):
        assert f"'{category}'" in text, f"Missing category: {category}"


def test_registry_statuses_and_priorities():
    text = _read(REGISTRY)
    for status in ("built", "partial", "planned"):
        assert f"status: '{status}'" in text
    for priority in ("P0", "P1"):
        assert f"priority: '{priority}'" in text


def test_workspace_types_exported():
    types = _read(TYPES)
    assert "RECORDING_WORKSPACE_TYPES" in types
    assert "recording-form-registry" in types


def test_p0_forms_in_registry():
    text = _read(REGISTRY)
    p0_ids = (
        "daily-note",
        "handover",
        "incident",
        "safeguarding-concern",
        "missing-episode",
        "physical-intervention",
        "child-voice",
    )
    for form_id in p0_ids:
        assert f"id: '{form_id}'" in text
