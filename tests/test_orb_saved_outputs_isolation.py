from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

import routers.orb_saved_output_routes as standalone_routes
import routers.orb_saved_outputs_launch_routes as launch_routes
from schemas.orb_saved_outputs import (
    OrbSavedOutputCreate,
    OrbSavedOutputExportRequest,
    OrbSavedOutputListRequest,
    OrbSavedOutputReuseRequest,
    OrbSavedOutputUpdate,
)
from services.orb_saved_output_service import orb_saved_output_service


@pytest.fixture(autouse=True)
def memory_outputs(monkeypatch):
    svc = orb_saved_output_service
    svc._memory = {}
    svc._storage_mode = "memory"
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "memory")


def _user(user_id: int) -> dict:
    return {"user_id": user_id, "id": user_id, "role": "orb_residential"}


def test_user_a_cannot_access_user_b_outputs():
    created = orb_saved_output_service.create_output(
        1,
        OrbSavedOutputCreate(title="User A note", type="general_research"),
    )

    assert orb_saved_output_service.get_output(2, created.id) is None
    listed = orb_saved_output_service.list_outputs(2, OrbSavedOutputListRequest())
    assert listed.total == 0
    assert orb_saved_output_service.export_output(2, created.id) is None
    assert orb_saved_output_service.reuse_output(2, created.id) is None
    assert orb_saved_output_service.update_output(
        2, created.id, OrbSavedOutputUpdate(title="Hijack")
    ) is None
    assert orb_saved_output_service.archive_output(2, created.id) is None
    assert orb_saved_output_service.delete_output(2, created.id) is False

    assert orb_saved_output_service.get_output(1, created.id) is not None


def test_standalone_and_launch_routes_enforce_user_scope():
    user_a = _user(10)
    user_b = _user(20)

    created = asyncio.run(
        standalone_routes.create_output(
            OrbSavedOutputCreate(title="Scoped", type="staff_briefing"),
            current_user=user_a,
        )
    )
    output_id = created["data"]["id"]

    with pytest.raises(HTTPException) as exc:
        asyncio.run(standalone_routes.get_output(output_id, current_user=user_b))
    assert exc.value.status_code == 404

    listed_b = asyncio.run(
        launch_routes.list_saved_outputs(current_user=user_b, limit=50, offset=0)
    )
    assert listed_b["data"].total == 0

    listed_a = asyncio.run(
        launch_routes.list_saved_outputs(current_user=user_a, limit=50, offset=0)
    )
    assert listed_a["data"].total == 1

    exported = asyncio.run(
        standalone_routes.export_output(
            output_id,
            OrbSavedOutputExportRequest(format="markdown"),
            current_user=user_a,
        )
    )
    assert exported["success"] is True

    reuse = asyncio.run(
        standalone_routes.reuse_output(
            output_id,
            OrbSavedOutputReuseRequest(instruction="continue"),
            current_user=user_a,
        )
    )
    assert reuse["success"] is True
