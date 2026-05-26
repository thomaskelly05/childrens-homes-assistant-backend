from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
LIFECYCLE = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-lifecycle.ts"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_lifecycle_behaviours_defined():
    text = _read(LIFECYCLE)
    for behaviour in (
        "archive_behaviour",
        "chronology_behaviour",
        "plan_impact_behaviour",
        "lifeecho_behaviour",
        "signed_off_only",
        "draft_never",
        "never_auto",
    ):
        assert behaviour in text


def test_safeguarding_never_auto_lifeecho():
    text = _read(LIFECYCLE)
    assert "'safeguarding-concern'" in text
    assert "never_auto" in text


def test_lifecycle_outcome_links():
    outcome = _read(REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-form-lifecycle-outcome.tsx")
    for test_id in (
        "recording-lifecycle-archive-link",
        "recording-lifecycle-chronology-link",
        "recording-lifecycle-plan-impacts-link",
        "recording-lifecycle-lifeecho-link",
    ):
        assert test_id in outcome
