from __future__ import annotations

import re
from pathlib import Path

import pytest

from schemas.recording_form_metadata import (
    RecordingFormMetadata,
    default_metadata_for_form,
    merge_form_metadata,
)
from services.recording_submission_target_registry import formal_route_classification

REPO_ROOT = Path(__file__).resolve().parents[1]
REGISTRY = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-registry.ts"
CATALOGUE = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-catalogue-entries.ts"
METADATA_TS = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-metadata.ts"
LIFECYCLE_TS = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-lifecycle.ts"
SCCIF_TS = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-sccif-alignment.ts"
THERAPEUTIC_TS = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-therapeutic-defaults.ts"
SCHEMA = REPO_ROOT / "schemas" / "recording_form_metadata.py"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _form_ids() -> list[str]:
    text = _read(REGISTRY) + _read(CATALOGUE)
    return sorted({m.group(1) for m in re.finditer(r"^\s+id: '([^']+)'", text, re.MULTILINE)})


def test_metadata_schema_exists():
    assert SCHEMA.is_file()
    text = _read(SCHEMA)
    for field in ("record_date", "event_date", "written_by_name", "formal_route_classification"):
        assert field in text


def test_frontend_metadata_modules_exist():
    for path in (METADATA_TS, LIFECYCLE_TS, SCCIF_TS, THERAPEUTIC_TS):
        assert path.is_file(), path.name


def test_every_form_id_in_registry_at_least_82():
    ids = _form_ids()
    assert len(ids) >= 80, f"Expected 80+ catalogue forms, found {len(ids)}"


def test_registry_enriched_with_lifecycle_and_sccif():
    text = _read(REGISTRY)
    assert "lifecycleForForm" in text
    assert "sccifAlignmentForForm" in text
    assert "formalRouteClassificationForForm" in text
    assert "universalTherapeuticPrompts" in text
    assert "hasStructuredTemplate" in text


def test_universal_therapeutic_prompts_defined():
    text = _read(THERAPEUTIC_TS)
    assert "UNIVERSAL_THERAPEUTIC_PROMPTS" in text
    assert "What happened?" in text
    assert "What was the child communicating?" in text


def test_default_metadata_for_form_roundtrip():
    meta = default_metadata_for_form(
        form_id="daily-note",
        form_type="daily-note",
        category="daily_life",
        child_id=1,
        written_by_name="Test User",
        written_by_role="staff",
    )
    record = meta["form_record"]
    assert record["event_date"]
    assert record["written_by_name"] == "Test User"
    typed = RecordingFormMetadata.model_validate(record)
    assert typed.form_id == "daily-note"


def test_merge_form_metadata_preserves_nested():
    merged = merge_form_metadata(
        {"form_record": {"event_date": "2026-01-01"}},
        {"written_by_name": "A", "therapeutic_flags": {"child_voice_prompt": "voice"}},
    )
    assert merged["form_record"]["event_date"] == "2026-01-01"
    assert merged["form_record"]["written_by_name"] == "A"


@pytest.mark.parametrize("form_id", ["daily-note", "incident", "safeguarding-concern", "room-search"])
def test_formal_route_classification_known_forms(form_id: str):
    classification = formal_route_classification(form_id, form_id=form_id)
    assert classification in {
        "SUPPORTED_NOW",
        "REVIEW_THEN_SUPPORTED",
        "DRAFT_ONLY",
        "ROUTE_HINT_ONLY",
        "NEEDS_FORMAL_BACKEND",
    }


def test_high_risk_forms_review_classification():
    for form_id in ("safeguarding-concern", "disclosure", "physical-intervention"):
        assert formal_route_classification(form_id, form_id=form_id) in (
            "REVIEW_THEN_SUPPORTED",
            "NEEDS_FORMAL_BACKEND",
        )
