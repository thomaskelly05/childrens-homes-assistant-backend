from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
QUEUE = REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-review-queue.tsx"
SIGNOFF = REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-review-signoff-result.tsx"
ACTIONS = REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-review-actions.tsx"
SUBMIT = REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-submission-result.tsx"


def test_review_queue_filter_tabs():
    text = QUEUE.read_text(encoding="utf-8")
    for label in (
        "Awaiting manager review",
        "Returned for amendment",
        "Signed off",
        "Escalated",
        "Overdue",
    ):
        assert label in text


def test_review_actions_show_errors():
    actions = ACTIONS.read_text(encoding="utf-8")
    assert "recording-review-action-error" in actions
    assert "setActionError" in actions


def test_lifecycle_links_on_signoff_and_submission():
    signoff = SIGNOFF.read_text(encoding="utf-8")
    submit = SUBMIT.read_text(encoding="utf-8")
    assert "recording-review-lifecycle-links" in signoff
    for testid in (
        "recording-review-open-archive",
        "recording-review-open-chronology",
        "recording-review-open-plan-impacts",
        "recording-review-open-lifeecho",
    ):
        assert testid in signoff
    assert "recording-submission-lifecycle-links" in submit
    assert "recording-open-child-chronology" in submit
