from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

import routers.inspection_readiness_routes as routes
from schemas.recording_drafts import RecordingDraftCreate
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def memory_drafts(monkeypatch):
    recording_draft_service._memory = {}
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")


def test_health_route(fake_state):
    result = asyncio.run(
        routes.inspection_readiness_health(current_user=fake_state["user"], conn=None)
    )
    assert result["success"] is True
    assert result["metadata_only"] is True
    assert result["standalone_access"] is False
    assert "disclaimer" in result["data"]


def test_dashboard_route(fake_state):
    result = asyncio.run(
        routes.inspection_readiness_dashboard(
            current_user=fake_state["user"], conn=None, limit=50
        )
    )
    assert result["success"] is True
    assert "reg44_summary" in result["data"]


def test_reg44_route(fake_state):
    result = asyncio.run(routes.get_reg44_pack(current_user=fake_state["user"], conn=None))
    assert result["success"] is True
    assert result["data"]["pack_type"] == "reg44"


def test_reg45_route(fake_state):
    result = asyncio.run(routes.get_reg45_pack(current_user=fake_state["user"], conn=None))
    assert result["data"]["pack_type"] == "reg45"


def test_sccif_and_quality_routes(fake_state):
    sccif = asyncio.run(routes.get_sccif_pack(current_user=fake_state["user"], conn=None))
    qs = asyncio.run(routes.get_quality_standards_pack(current_user=fake_state["user"], conn=None))
    assert sccif["data"]["pack_type"] == "sccif"
    assert qs["data"]["pack_type"] == "quality_standards"


def test_generate_route(fake_state):
    result = asyncio.run(
        routes.generate_inspection_pack(
            body={"pack_type": "reg44"},
            current_user=fake_state["user"],
            conn=None,
        )
    )
    assert result["success"] is True


def test_history_route(fake_state):
    result = asyncio.run(
        routes.list_inspection_packs(current_user=fake_state["user"], conn=None, limit=20)
    )
    assert "packs" in result["data"]


def test_auth_required_for_non_manager(fake_state):
    user = {**fake_state["user"], "role": "carer"}
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            routes.inspection_readiness_dashboard(current_user=user, conn=None, limit=50)
        )
    assert exc.value.status_code == 403
