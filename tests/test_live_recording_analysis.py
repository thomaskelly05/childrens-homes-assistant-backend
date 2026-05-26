from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ANALYSIS = REPO_ROOT / "frontend-next" / "lib" / "record" / "live-recording-analysis.ts"
GUIDANCE = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-guidance.ts"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_live_recording_analysis_file_exists():
    assert ANALYSIS.is_file()


def test_live_analysis_markers():
    text = _read(ANALYSIS)
    for marker in (
        "analyseLiveRecording",
        "LiveRecordingAnalysis",
        "therapeuticLanguageHints",
        "childVoiceHints",
        "adultResponseHints",
        "planImpactHints",
        "safeguardingFlags",
        "readinessStatus",
        "debounce",
        "FACTUAL_ACCURACY_WARNING",
    ):
        assert marker in text, f"Missing live analysis marker: {marker}"


def test_judgemental_language_substitutions_in_guidance():
    text = _read(GUIDANCE)
    for phrase in ("kicked off", "attention seeking", "refused", "manipulative", "non-compliant"):
        assert phrase in text.lower()


def test_plan_impact_form_categories():
    text = _read(ANALYSIS)
    assert "planImpactHints" in text
    assert "health_medication" in text or "PLAN_IMPACT_FORM_CATEGORIES" in text


def test_local_analysis_does_not_send_body():
    text = _read(ANALYSIS)
    assert "fetch(" not in text
    assert "authFetch" not in text
