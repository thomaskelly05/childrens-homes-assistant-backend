from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

import routers.orb_saved_output_routes as output_routes
from auth.orb_product_bootstrap_dependency import require_orb_product_bootstrap_access


@pytest.fixture(autouse=True)
def memory_outputs(monkeypatch):
    svc = output_routes.orb_saved_output_service
    svc._memory = {}
    svc._storage_mode = "memory"
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "memory")


def test_unauthenticated_summary_dependency_returns_401():
    with pytest.raises(HTTPException) as exc:
        require_orb_product_bootstrap_access(conn=None, current_user={})
    assert exc.value.status_code == 401


def test_active_summary_returns_payload(fake_state, monkeypatch):
    summary = asyncio.run(output_routes.outputs_summary(current_user=fake_state["user"]))
    assert summary["success"] is True
    assert "data" in summary
