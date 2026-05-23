from __future__ import annotations

import asyncio

import pytest
from fastapi.routing import APIRoute

from routers import orb_operational_output_routes
from schemas.orb_operational_outputs import OrbOperationalOutputCreate


@pytest.fixture(autouse=True)
def memory_outputs(monkeypatch):
    from services.orb_operational_output_service import orb_operational_output_service

    orb_operational_output_service._memory = {}
    monkeypatch.setattr(orb_operational_output_service, "_detect_storage_mode", lambda: "memory")


def test_routes_registered():
    from app import app

    paths = {route.path for route in app.router.routes if isinstance(route, APIRoute)}
    assert "/assistant/orb/outputs/health" in paths
    assert "/api/assistant/orb/outputs/health" in paths


def test_health(fake_state):
    response = asyncio.run(
        orb_operational_output_routes.outputs_health(current_user=fake_state["user"])
    )
    assert response["success"] is True
    assert response["os_linked"] is True
    assert response["standalone_only"] is False


def test_create_list_get(fake_state):
    created = asyncio.run(
        orb_operational_output_routes.create_output(
            OrbOperationalOutputCreate(title="Test briefing", type="manager_briefing"),
            conn=None,
            current_user=fake_state["user"],
        )
    )
    output_id = created["data"]["id"]

    listed = asyncio.run(
        orb_operational_output_routes.list_outputs(
            output_type=None,
            status=None,
            review_status=None,
            visibility=None,
            home_id=None,
            child_id=None,
            staff_id=None,
            tag=None,
            search=None,
            include_archived=False,
            awaiting_review_only=False,
            limit=50,
            offset=0,
            current_user=fake_state["user"],
            conn=None,
        )
    )
    assert listed["data"]["total"] >= 1

    fetched = asyncio.run(
        orb_operational_output_routes.get_output(
            output_id, conn=None, current_user=fake_state["user"]
        )
    )
    assert fetched["data"]["title"] == "Test briefing"


def test_export_and_review(fake_state):
    created = asyncio.run(
        orb_operational_output_routes.create_output(
            OrbOperationalOutputCreate(
                title="Safeguarding review",
                type="safeguarding_theme_review",
                content_markdown="## Review",
            ),
            conn=None,
            current_user=fake_state["user"],
        )
    )
    output_id = created["data"]["id"]

    from schemas.orb_operational_outputs import OrbOperationalOutputExportRequest, OrbOperationalOutputReviewRequest

    exported = asyncio.run(
        orb_operational_output_routes.export_output(
            output_id,
            OrbOperationalOutputExportRequest(format="markdown"),
            conn=None,
            current_user=fake_state["user"],
        )
    )
    assert "content" in exported["data"]

    reviewed = asyncio.run(
        orb_operational_output_routes.mark_for_review(
            output_id,
            OrbOperationalOutputReviewRequest(),
            conn=None,
            current_user=fake_state["user"],
        )
    )
    assert reviewed["data"]["review_status"] == "awaiting_review"
