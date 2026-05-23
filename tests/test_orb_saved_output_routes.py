from __future__ import annotations

import asyncio

import pytest

import routers.orb_saved_output_routes as output_routes
from schemas.orb_saved_outputs import (
    OrbSavedOutputCreate,
    OrbSavedOutputExportRequest,
    OrbSavedOutputReuseRequest,
    OrbSavedOutputUpdate,
)
from services.orb_saved_output_service import orb_saved_output_service


@pytest.fixture(autouse=True)
def memory_outputs(monkeypatch):
    svc = orb_saved_output_service
    svc._memory = {}
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "memory")


def test_outputs_health_and_summary(fake_state):
    health = asyncio.run(output_routes.outputs_health(current_user=fake_state["user"]))
    assert health["success"] is True
    assert health["data"]["standalone_only"] is True

    summary = asyncio.run(output_routes.outputs_summary(current_user=fake_state["user"]))
    assert summary["success"] is True


def test_create_list_get_patch_archive_export_reuse_delete(fake_state):
    created = asyncio.run(
        output_routes.create_output(
            OrbSavedOutputCreate(
                title="Staff briefing",
                type="staff_briefing",
                summary="For team huddle",
                content_markdown="# Staff briefing\n\nPoints",
                tags=["staff"],
            ),
            current_user=fake_state["user"],
        )
    )
    output_id = created["data"]["id"]

    listed = asyncio.run(
        output_routes.list_outputs(limit=50, offset=0, current_user=fake_state["user"])
    )
    assert listed["success"] is True
    assert listed["data"]["total"] >= 1

    got = asyncio.run(
        output_routes.get_output(output_id, current_user=fake_state["user"])
    )
    assert got["data"]["title"] == "Staff briefing"

    patched = asyncio.run(
        output_routes.update_output(
            output_id,
            OrbSavedOutputUpdate(title="Updated briefing"),
            current_user=fake_state["user"],
        )
    )
    assert patched["data"]["title"] == "Updated briefing"

    exported = asyncio.run(
        output_routes.export_output(
            output_id,
            OrbSavedOutputExportRequest(format="markdown"),
            current_user=fake_state["user"],
        )
    )
    assert "Staff briefing" in exported["data"]["content"] or "Updated briefing" in exported["data"]["content"]

    reuse = asyncio.run(
        output_routes.reuse_output(
            output_id,
            OrbSavedOutputReuseRequest(instruction="shorten for staff"),
            current_user=fake_state["user"],
        )
    )
    assert "suggested_prompt" in reuse["data"]

    archived = asyncio.run(
        output_routes.archive_output(output_id, current_user=fake_state["user"])
    )
    assert archived["data"]["status"] == "archived"

    deleted = asyncio.run(
        output_routes.delete_output(output_id, current_user=fake_state["user"])
    )
    assert deleted["data"]["deleted"] is True


def test_rejects_os_ids(fake_state):
    with pytest.raises(Exception):
        asyncio.run(
            output_routes.create_output(
                OrbSavedOutputCreate(
                    title="Bad",
                    type="general_research",
                    metadata={"child_id": "c1"},
                ),
                current_user=fake_state["user"],
            )
        )
