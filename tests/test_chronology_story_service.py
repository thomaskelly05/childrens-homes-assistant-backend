from __future__ import annotations

import pytest

from schemas.child_archive import ChildArchiveRecord
from schemas.child_chronology_story import ChronologyStoryFilter
from services.child_archive_service import child_archive_service
from services.child_chronology_story_service import child_chronology_story_service


@pytest.fixture(autouse=True)
def memory(monkeypatch):
    child_archive_service._memory = {}
    monkeypatch.setattr(child_archive_service, "_detect_storage_mode", lambda: "memory")


def test_chronology_groups_by_month(fake_state):
    user = fake_state["user"]
    for month, title in [("2026-05-10", "May event"), ("2026-04-02", "April event")]:
        rec = ChildArchiveRecord(
            id=f"arch_{title}",
            child_id=1,
            title=title,
            safe_summary="Safe",
            source_type="daily-note",
            source_id=title,
            event_date=month,
            signed_off_at=month,
        )
        child_archive_service.upsert_archive_record(rec, user, conn=None)

    story = child_chronology_story_service.build_story(
        ChronologyStoryFilter(child_id=1), user, conn=None
    )
    assert story.total_events == 2
    month_sections = [s for s in story.sections if s.kind == "month"]
    assert len(month_sections) >= 2
