from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
REVIEW = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-review-detail.tsx"


def test_review_quality_summary_markers():
    text = REVIEW.read_text(encoding="utf-8")
    for marker in (
        "recording-review-quality-summary",
        "ORB / live coach quality summary",
        "recording-review-readiness-status",
        "recording-review-signoff-recommendation",
        "Child voice",
        "Adult response",
        "Plan impact considered",
        "Event date",
        "Written by",
    ):
        assert marker in text, f"Missing review quality marker: {marker}"
