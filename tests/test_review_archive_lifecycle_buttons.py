from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_review_actions_show_errors():
    text = (FRONTEND / "components/indicare/record/recording-review-actions.tsx").read_text(encoding="utf-8")
    assert "actionError" in text
    assert "finally" in text


def test_archive_filter_has_submit_handler():
    text = (FRONTEND / "components/young-people/archive/archive-filter-bar.tsx").read_text(encoding="utf-8")
    assert "onSubmit" in text
    assert "preventDefault" in text


def test_lifeecho_upload_has_handler():
    text = (FRONTEND / "components/young-people/lifeecho/lifeecho-upload-photo.tsx").read_text(encoding="utf-8")
    assert "onSubmit" in text
