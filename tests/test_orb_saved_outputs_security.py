from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

import routers.orb_saved_output_routes as standalone_routes
from auth.orb_standalone_premium_dependency import require_rich_orb_premium_access
from schemas.orb_saved_outputs import OrbSavedOutputCreate
from services.orb_saved_output_service import orb_saved_output_service


@pytest.fixture(autouse=True)
def memory_outputs(monkeypatch):
    svc = orb_saved_output_service
    svc._memory = {}
    svc._storage_mode = "memory"
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "memory")


def test_saved_outputs_module_requires_premium_alias():
    assert standalone_routes.require_standalone_orb_access is require_rich_orb_premium_access


def test_unauthenticated_premium_dependency_rejects():
    from unittest.mock import MagicMock

    with pytest.raises(HTTPException) as exc:
        require_rich_orb_premium_access(conn=MagicMock(), current_user={})
    assert exc.value.status_code == 401


def test_user_scoped_outputs_isolated():
    created = orb_saved_output_service.create_output(
        1,
        OrbSavedOutputCreate(title="Private", type="general_research"),
    )
    assert orb_saved_output_service.get_output(2, created.id) is None


def test_get_output_route_returns_404_for_other_user():
    user_a = {"user_id": 10, "id": 10, "role": "orb_residential"}
    user_b = {"user_id": 20, "id": 20, "role": "orb_residential"}
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
