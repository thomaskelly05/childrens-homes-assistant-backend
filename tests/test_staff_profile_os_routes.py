from __future__ import annotations

import asyncio

import pytest

from routers import staff_profile_os_routes as routes


def test_health_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(routes.staff_profile_os_health(current_user=user, conn=None))
    assert result["success"] is True
    assert result["metadata_only"] is True
    assert result["standalone_access"] is False
    assert result["data"]["service"] == "staff_profile_os_service"


def test_dashboard_route(fake_state):
    user = fake_state["user"]
    staff_id = int(user["id"])
    result = asyncio.run(routes.staff_profile_os_dashboard(staff_id=staff_id, current_user=user, conn=None))
    assert result["success"] is True
    assert result["data"]["overview"]
    assert result["data"]["sections"]


def test_overview_route(fake_state):
    user = fake_state["user"]
    staff_id = int(user["id"])
    result = asyncio.run(routes.staff_profile_os_overview(staff_id=staff_id, current_user=user, conn=None))
    assert result["success"] is True
    assert result["data"]["staff_name"]


def test_section_routes(fake_state):
    user = fake_state["user"]
    staff_id = int(user["id"])
    for handler in (
        routes.staff_profile_os_actions,
        routes.staff_profile_os_training,
        routes.staff_profile_os_supervision,
        routes.staff_profile_os_wellbeing,
    ):
        result = asyncio.run(handler(staff_id=staff_id, current_user=user, conn=None))
        assert result["success"] is True
        assert result["data"]["items"] is not None


def test_routes_registered():
    paths = {getattr(r, "path", "") for r in routes.router.routes}
    assert "/staff-profile-os/health" in paths
    assert "/staff-profile-os/{staff_id}" in paths
    compat_paths = {getattr(r, "path", "") for r in routes.compat_router.routes}
    assert "/api/staff-profile-os/{staff_id}" in compat_paths
