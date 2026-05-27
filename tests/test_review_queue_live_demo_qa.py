from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
QUEUE = REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-review-queue.tsx"
REVIEWS_PAGE = REPO / "frontend-next" / "app" / "record" / "reviews" / "page.tsx"
SIGNOFF = REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-review-signoff-result.tsx"

STATUS_LABELS = [
    "Awaiting manager review",
    "Returned for amendment",
    "Signed off",
    "Escalated",
    "Overdue",
]


def test_review_queue_page_and_component():
    page = REVIEWS_PAGE.read_text(encoding="utf-8")
    assert "recording-reviews-page" in page
    assert "Back to recording" in page
    assert "RecordingReviewQueue" in page

    queue = QUEUE.read_text(encoding="utf-8")
    assert "recording-review-queue" in queue
    for label in STATUS_LABELS:
        assert label in queue, label


def test_signoff_result_has_lifecycle_links():
    text = SIGNOFF.read_text(encoding="utf-8")
    for marker in ("archive", "chronology", "plan-impacts", "lifeecho"):
        assert marker in text.lower() or "plan-impacts" in text or "lifeecho" in text
