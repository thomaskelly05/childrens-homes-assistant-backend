from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

COACH_FILES = [
    FRONTEND / "components" / "indicare" / "record" / "orb-live-recording-coach.tsx",
    FRONTEND / "components" / "indicare" / "record" / "orb-live-suggestion-card.tsx",
    FRONTEND / "components" / "indicare" / "record" / "orb-recording-readiness-meter.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-workspace.tsx",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_orb_live_coach_files_exist():
    for path in COACH_FILES:
        assert path.is_file(), f"Missing: {path}"


def test_orb_live_coach_panel_markers():
    combined = "\n".join(_read(p) for p in COACH_FILES)
    for marker in (
        "orb-live-recording-coach",
        "ORB is supporting this record",
        "orb-live-suggestion-card",
        "orb-suggestion-accept",
        "orb-suggestion-copy",
        "orb-suggestion-dismiss",
        "orb-recording-readiness-meter",
        "orb-ask-for-help",
        "Ask ORB for help",
        "analyseLiveRecording",
    ):
        assert marker in combined, f"Missing coach marker: {marker}"


def test_suggestions_not_auto_applied():
    coach = _read(FRONTEND / "components" / "indicare" / "record" / "orb-live-suggestion-card.tsx")
    editor = _read(FRONTEND / "components" / "indicare" / "record" / "recording-editor.tsx")
    assert "onAccept" in coach
    assert "onDismiss" in coach
    assert "replace(" not in coach.lower()
    assert "autoReplace" not in editor


def test_orb_hrefs_no_draft_body():
    combined = "\n".join(_read(p) for p in COACH_FILES)
    hrefs = re.findall(r'["\']([^"\']*/assistant/orb[^"\']*)["\']', combined)
    for href in hrefs:
        lower = href.lower()
        assert "body=" not in lower
        assert "draft=" not in lower
