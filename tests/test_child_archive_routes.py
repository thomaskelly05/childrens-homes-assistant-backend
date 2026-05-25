from __future__ import annotations

import asyncio

import pytest

import routers.child_archive_routes as archive_routes
from services.child_archive_service import child_archive_service


@pytest.fixture(autouse=True)
def memory_archive(monkeypatch):
    child_archive_service._memory = {}
    monkeypatch.setattr(child_archive_service, "_detect_storage_mode", lambda: "memory")


def test_archive_health_route(fake_state):
    result = asyncio.run(archive_routes.archive_health(current_user=fake_state["user"], conn=None))
    assert result["success"] is True
    assert result["operational_only"] is True


def test_list_archive_route(fake_state):
    from schemas.child_archive import ChildArchiveRecord

    child_archive_service._memory["a1"] = ChildArchiveRecord(
        id="a1",
        child_id=1,
        title="Test",
        safe_summary="Summary",
        source_type="daily-note",
        source_id="1",
    ).model_dump()
    result = asyncio.run(
        archive_routes.list_archive_records(
            child_id=1,
            home_id=None,
            record_type=None,
            source_type=None,
            date_from=None,
            date_to=None,
            author_user_id=None,
            signed_off_by_user_id=None,
            search=None,
            page=1,
            page_size=50,
            current_user=fake_state["user"],
            conn=None,
        )
    )
    assert result["success"]
    assert len(result["data"]["records"]) >= 1
