from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

RECORD_ORB_FILES = [
    FRONTEND / "components" / "indicare" / "record" / "recording-orb-rail.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-workspace.tsx",
    FRONTEND / "components" / "indicare" / "record" / "record-hub.tsx",
    FRONTEND / "lib" / "record" / "recording-quality-coach.ts",
]

FORBIDDEN_STANDALONE_QUERY_KEYS = [
    "child_id=",
    "young_person_id=",
    "home_id=",
    "staff_id=",
    "record_id=",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_operational_orb_record_quality_review_href():
    combined = "\n".join(_read(path) for path in RECORD_ORB_FILES)
    assert "/assistant/orb?mode=record_quality_review" in combined


def test_standalone_orb_recording_context_without_child_ids():
    combined = "\n".join(_read(path) for path in RECORD_ORB_FILES)
    assert "/orb?context=recording" in combined
    standalone_hrefs = re.findall(r'["\'](/orb[^"\']*)["\']', combined)
    assert standalone_hrefs, "Expected standalone /orb hrefs in recording workspace"
    for href in standalone_hrefs:
        for key in FORBIDDEN_STANDALONE_QUERY_KEYS:
            assert key not in href, f"Standalone ORB href must not include {key}: {href}"


def test_no_draft_body_in_orb_urls():
    combined = "\n".join(_read(path) for path in RECORD_ORB_FILES)
    hrefs = re.findall(r'["\']([^"\']*/(?:assistant/)?orb[^"\']*)["\']', combined)
    for href in hrefs:
        lower = href.lower()
        assert "draft=" not in lower
        assert "body=" not in lower
        assert "title=" not in lower
