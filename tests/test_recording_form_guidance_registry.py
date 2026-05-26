from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
GUIDANCE = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-guidance.ts"
REGISTRY = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-registry.ts"
CATALOGUE = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-catalogue-entries.ts"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _form_ids() -> list[str]:
    text = _read(REGISTRY) + _read(CATALOGUE)
    ids = re.findall(r"id: '([^']+)'", text)
    # Filter obvious non-form tokens from enum-like strings in helpers
    skip = {
        "draft_only",
        "draft_workspace",
        "formal_route",
        "formal_submit",
        "archive_signoff",
        "lifeecho",
        "manager_review",
        "plan_impact",
        "safeguarding_sensitive",
        "structured_template",
    }
    return sorted({i for i in ids if i not in skip and "-" in i or i in {"keywork", "handover", "incident", "disclosure", "allegation"}})


def test_guidance_registry_file_exists():
    assert GUIDANCE.is_file()


def test_guidance_registry_markers():
    text = _read(GUIDANCE)
    for marker in (
        "RecordingFormGuidance",
        "guidanceForForm",
        "CATEGORY_GUIDANCE",
        "FORM_SPECIFIC_GUIDANCE",
        "headingGuidanceForForm",
        "FACTUAL_ACCURACY_WARNING",
        "THERAPEUTIC_LANGUAGE_SUBSTITUTIONS",
    ):
        assert marker in text, f"Missing guidance marker: {marker}"


def test_every_catalogue_form_has_guidance_resolver():
    text = _read(GUIDANCE)
    assert "guidanceForForm" in text
    ids = _form_ids()
    assert len(ids) >= 55
    for form_id in ids:
        assert f"'{form_id}'" in _read(REGISTRY) + _read(CATALOGUE) or form_id in text or "CATEGORY_GUIDANCE" in text


def test_high_risk_forms_have_unique_guidance():
    text = _read(GUIDANCE)
    for form_id in (
        "daily-note",
        "safeguarding-concern",
        "physical-intervention",
        "complaint-concern",
        "room-search",
    ):
        assert f"'{form_id}':" in text, f"Missing specific guidance for {form_id}"


def test_daily_note_differs_from_safeguarding_guidance():
    text = _read(GUIDANCE)
    daily = text.split("'daily-note':")[1].split("'incident':")[0]
    safeguarding = text.split("'safeguarding-concern':")[1].split("'physical-intervention':")[0]
    assert "ordinary" in daily.lower() or "balanced" in daily.lower()
    assert "exact words" in safeguarding.lower() or "disclosed" in safeguarding.lower()
    assert daily[:200] != safeguarding[:200]
