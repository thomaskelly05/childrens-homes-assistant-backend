from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
REVIEWS_PAGE = REPO_ROOT / "frontend-next" / "app" / "record" / "reviews" / "page.tsx"
ALERTS_PAGE = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-alerts-page.tsx"
REVIEW_QUEUE = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-review-queue.tsx"
SCOPE_ROUTES = REPO_ROOT / "frontend-next" / "lib" / "navigation" / "scope-routes.ts"


def test_scope_routes_review_and_alert_helpers():
    text = SCOPE_ROUTES.read_text(encoding="utf-8")
    assert "childReviewsHref" in text
    assert "childAlertsHref" in text
    assert "homeRecordingReviewsHref" in text
    assert "homeRecordingAlertsHref" in text


def test_reviews_page_reads_child_and_home_filters():
    text = REVIEWS_PAGE.read_text(encoding="utf-8")
    assert "child_id" in text
    assert "home_id" in text
    assert "homeIdFilter" in text


def test_alerts_page_reads_home_filter():
    text = ALERTS_PAGE.read_text(encoding="utf-8")
    assert "home_id" in text
    assert "homeFilter" in text


def test_review_queue_passes_home_id_to_api():
    text = REVIEW_QUEUE.read_text(encoding="utf-8")
    assert "homeIdFilter" in text
    assert "home_id: homeIdFilter" in text
