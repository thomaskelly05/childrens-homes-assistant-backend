from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def test_lifeecho_page_and_upload():
    page = (REPO / "frontend-next/app/young-people/[id]/lifeecho/page.tsx").read_text(encoding="utf-8")
    assert "child-lifeecho-page" in page
    assert "lifeecho-upload-photo" in (REPO / "frontend-next/components/young-people/lifeecho/lifeecho-upload-photo.tsx").read_text(
        encoding="utf-8"
    )
    assert "lifeecho-suggestion-card" in (REPO / "frontend-next/components/young-people/lifeecho/lifeecho-suggestion-card.tsx").read_text(
        encoding="utf-8"
    )
