from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

REVIEW_FILES = [
    FRONTEND / "app" / "record" / "reviews" / "page.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-review-queue.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-review-detail.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-review-actions.tsx",
    FRONTEND / "lib" / "os-api" / "recording-reviews.ts",
]

STANDALONE_ORB = FRONTEND / "app" / "orb"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_recording_review_queue_page_exists():
    page = FRONTEND / "app" / "record" / "reviews" / "page.tsx"
    assert page.is_file()
    text = _read(page)
    assert "Recording review queue" in text
    assert "recording-reviews-page" in text


def test_review_ui_markers():
    combined = "\n".join(_read(path) for path in REVIEW_FILES)
    assert "Awaiting review" in combined
    assert "Safeguarding review" in combined
    assert "Request changes" in combined
    assert "Approve" in combined
    assert "Submit after approval" in combined
    assert "Manager judgement remains required" in combined
    assert "Open child journey" in combined
    assert "Open draft" in combined or "Open draft in /record" in combined
    assert "recording-review-structured-summary" in combined
    assert "Structured summary" in combined


def test_orb_prompts_use_operational_orb_only():
    combined = "\n".join(_read(path) for path in REVIEW_FILES)
    assert "operationalOrbReviewHref" in combined
    assert "record_quality_review" in combined
    assert "safeguarding_themes" in combined
    assert "/assistant/orb" in combined
    orb_hrefs = re.findall(r'["\']([^"\']*/(?:assistant/)?orb[^"\']*)["\']', combined)
    for href in orb_hrefs:
        lower = href.lower()
        assert "draft=" not in lower
        assert "body=" not in lower


def test_standalone_orb_does_not_import_recording_reviews():
    if not STANDALONE_ORB.exists():
        return
    for path in list(STANDALONE_ORB.rglob("*.tsx")) + list(STANDALONE_ORB.rglob("*.ts")):
        text = _read(path)
        assert "recording-reviews" not in text, f"Standalone ORB must not import recording reviews: {path}"
