from __future__ import annotations

from pathlib import Path

QUEUE = (
    Path(__file__).resolve().parents[1]
    / "frontend-next"
    / "components"
    / "indicare"
    / "record"
    / "recording-review-queue.tsx"
)


def test_approval_queue_status_filters():
    text = QUEUE.read_text(encoding="utf-8")
    for label in (
        "Awaiting manager review",
        "Returned for amendment",
        "Signed off",
        "Escalated",
        "Overdue",
    ):
        assert label in text


def test_approval_queue_summary_test_ids():
    text = QUEUE.read_text(encoding="utf-8")
    assert "recording-review-summary-awaiting-manager" in text
    assert "recording-review-summary-signed-off" in text
    assert "recording-review-queue-status-summary" in text
