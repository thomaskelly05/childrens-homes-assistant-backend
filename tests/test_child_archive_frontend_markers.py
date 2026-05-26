from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def test_child_archive_page_markers():
    text = (REPO / "frontend-next/app/young-people/[id]/archive/page.tsx").read_text(encoding="utf-8")
    assert "child-archive-page" in text
    assert "ChildArchiveLibrary" in text
    library = (REPO / "frontend-next/components/young-people/archive/child-archive-library.tsx").read_text(
        encoding="utf-8"
    )
    assert "child-archive-filter-bar" in library or "ArchiveFilterBar" in library


def test_archive_components_exist():
    lib = REPO / "frontend-next/components/young-people/archive"
    assert (lib / "child-archive-library.tsx").is_file()
    assert (lib / "archive-record-card.tsx").is_file()
