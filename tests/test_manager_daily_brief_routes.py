from __future__ import annotations

import asyncio

import pytest

from routers import manager_daily_brief_routes as brief_routes
from services.manager_daily_brief_service import manager_daily_brief_service


def test_health_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(brief_routes.manager_daily_brief_health(current_user=user, conn=None))
    assert result["success"] is True
    assert result["data"]["service"] == "manager_daily_brief_service"


def test_get_brief_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(brief_routes.get_manager_daily_brief(current_user=user, conn=None))
    assert result["success"] is True
    assert result["metadata_only"] is True
    assert "opening_summary" in result["data"]


def test_mark_reviewed_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(
        brief_routes.mark_manager_daily_brief_reviewed(body=None, current_user=user, conn=None)
    )
    assert result["success"] is True
    assert result["data"]["reviewed"] is True
    assert manager_daily_brief_service.is_reviewed_today(user)


def test_brief_routes_registered():
    from routers import manager_daily_brief_routes

    paths = {getattr(r, "path", "") for r in manager_daily_brief_routes.router.routes}
    assert "/manager-daily-brief" in paths
    assert "/manager-daily-brief/health" in paths
    assert "/manager-daily-brief/mark-reviewed" in paths
