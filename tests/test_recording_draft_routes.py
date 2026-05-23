from __future__ import annotations

import asyncio

import pytest

import routers.recording_draft_routes as draft_routes
from schemas.recording_drafts import RecordingDraftCreate, RecordingDraftSubmitRequest, RecordingDraftUpdate
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def memory_drafts(monkeypatch):
    svc = recording_draft_service
    svc._memory = {}
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "memory")


def test_recording_drafts_health_requires_auth_shape(fake_state):
    health = asyncio.run(draft_routes.recording_drafts_health(current_user=fake_state["user"]))
    assert health["success"] is True
    assert health["operational_only"] is True
    assert health["standalone_access"] is False


def test_recording_draft_route_lifecycle(fake_state):
    user = fake_state["user"]
    created = asyncio.run(
        draft_routes.create_recording_draft(
            RecordingDraftCreate(
                title="Note",
                body="Body text",
                recording_type="daily-note",
                context_type="child",
            ),
            current_user=user,
            conn=None,
        )
    )
    draft_id = created["data"]["id"]

    listed = asyncio.run(
        draft_routes.list_recording_drafts(limit=20, offset=0, current_user=user, conn=None)
    )
    assert listed["data"]["total"] >= 1

    got = asyncio.run(draft_routes.get_recording_draft(draft_id, current_user=user, conn=None))
    assert got["data"]["title"] == "Note"

    autosaved = asyncio.run(
        draft_routes.autosave_recording_draft(
            draft_id,
            RecordingDraftUpdate(body="Updated body"),
            current_user=user,
            conn=None,
        )
    )
    assert autosaved["data"]["body"] == "Updated body"

    ready = asyncio.run(
        draft_routes.ready_for_review_recording_draft(draft_id, current_user=user, conn=None)
    )
    assert ready["data"]["status"] == "ready_for_review"

    submitted = asyncio.run(
        draft_routes.submit_recording_draft(
            draft_id,
            RecordingDraftSubmitRequest(),
            current_user=user,
            conn=None,
        )
    )
    assert submitted["data"]["formal_record_created"] is False
    assert "not fully wired" in submitted["data"]["warning"].lower()

    archived = asyncio.run(
        draft_routes.archive_recording_draft(draft_id, current_user=user, conn=None)
    )
    assert archived["data"]["status"] == "archived"

    deleted = asyncio.run(
        draft_routes.delete_recording_draft(draft_id, current_user=user, conn=None)
    )
    assert deleted["data"]["status"] == "deleted"
