from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

REVIEW_FILES = [
    FRONTEND / "app" / "handover" / "reviews" / "page.tsx",
    FRONTEND / "components" / "handover" / "handover-review-queue.tsx",
    FRONTEND / "components" / "handover" / "handover-review-detail.tsx",
    FRONTEND / "components" / "handover" / "handover-review-actions.tsx",
    FRONTEND / "components" / "handover" / "handover-status-badge.tsx",
    FRONTEND / "lib" / "os-api" / "handover-intelligence.ts",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_handover_review_page_markers():
    combined = "\n".join(_read(p) for p in REVIEW_FILES)
    for marker in (
        "Handover review",
        "Approve",
        "Request changes",
        "Complete after approval",
        "Formal record created",
        "Timeline linked",
        "Manager judgement remains required",
        "listHandoverReviewQueue",
        "applyHandoverReviewAction",
    ):
        assert marker in combined, f"Missing marker: {marker}"


def test_review_operational_orb_only():
    combined = "\n".join(_read(p) for p in REVIEW_FILES)
    for href in re.findall(r'href=["\']([^"\']+)["\']', combined):
        if "/orb" not in href:
            continue
        assert href.startswith("/assistant/orb"), f"Review UI must use operational ORB: {href}"


def test_review_client_not_in_standalone():
    standalone = _read(FRONTEND / "lib" / "orb" / "standalone-client.ts")
    assert "listHandoverReviewQueue" not in standalone
    assert "/api/handover/reviews" not in standalone
