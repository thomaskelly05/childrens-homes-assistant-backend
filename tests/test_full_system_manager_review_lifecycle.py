from __future__ import annotations

from tests.full_system_qa_helpers import FRONTEND, read

REVIEWS_PAGE = FRONTEND / "app" / "record" / "reviews" / "page.tsx"
REVIEW_DETAIL = FRONTEND / "components" / "indicare" / "record" / "recording-review-detail.tsx"
SIGNOFF_SERVICE = FRONTEND.parent / "services" / "recording_review_signoff_service.py"
SUBMISSION_ROUTER = FRONTEND.parent / "services" / "recording_submission_router_service.py"


def test_reviews_page_accepts_child_scope():
    text = read(REVIEWS_PAGE)
    assert "child_id" in text


def test_review_detail_shows_metadata_and_quality():
    text = read(REVIEW_DETAIL)
    for marker in ("event_date", "written_by", "recording_type", "quality", "signoff", "review"):
        assert marker.lower() in text.lower() or marker in text, marker


def test_signoff_service_exists():
    assert SIGNOFF_SERVICE.is_file()
    text = read(SIGNOFF_SERVICE)
    assert "sign_off" in text or "signoff" in text.lower()


def test_submission_router_honest_formal_route():
    assert SUBMISSION_ROUTER.is_file()
    text = read(SUBMISSION_ROUTER)
    assert "review_required" in text or "formal" in text.lower()
