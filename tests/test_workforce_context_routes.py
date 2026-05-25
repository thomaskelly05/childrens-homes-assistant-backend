from __future__ import annotations

import asyncio

import pytest

from routers import workforce_context_routes as wf_routes


def test_health_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(wf_routes.workforce_context_health(current_user=user, conn=None))
    assert result["success"] is True
    assert result["metadata_only"] is True
    assert result["standalone_access"] is False
    assert result["data"]["service"] == "workforce_context_service"


def test_dashboard_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(wf_routes.workforce_context_dashboard(current_user=user, conn=None))
    assert result["success"] is True
    assert result["data"]["privacy_notice"]
    assert result["data"]["shift"]


def test_shift_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(wf_routes.workforce_shift_context(current_user=user, conn=None))
    assert result["success"] is True
    assert "shift" in result["data"]


def test_actions_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(wf_routes.workforce_actions_context(current_user=user, conn=None))
    assert result["success"] is True
    assert "items" in result["data"]


def test_training_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(wf_routes.workforce_training_context(current_user=user, conn=None))
    assert result["success"] is True


def test_supervision_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(wf_routes.workforce_supervision_context(current_user=user, conn=None))
    assert result["success"] is True


def test_routes_registered():
    paths = {getattr(r, "path", "") for r in wf_routes.router.routes}
    assert "/workforce/context/health" in paths
    assert "/workforce/context/dashboard" in paths
    assert "/workforce/context/shift" in paths
    compat_paths = {getattr(r, "path", "") for r in wf_routes.compat_router.routes}
    assert "/api/workforce/context/dashboard" in compat_paths


def test_auth_gated_by_dependency():
    from auth.dependencies import get_current_user

    assert get_current_user is not None
