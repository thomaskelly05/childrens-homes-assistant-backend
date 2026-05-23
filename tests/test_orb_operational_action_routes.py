from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import pytest

from routers import orb_operational_routes
from schemas.orb_operational import (
    OrbOperationalActionsCreateRequest,
    OrbOperationalActionsDraftRequest,
    OrbOperationalBriefingRequest,
    OrbOperationalDraftAction,
    OrbOperationalRequest,
)


def test_context_cards_route(fake_state):
    response = asyncio.run(
        orb_operational_routes.operational_orb_context_cards(
            conn=None,
            current_user=fake_state["user"],
            scope="current_user",
            mode="manager_daily_brief",
        )
    )
    assert response["success"] is True
    assert "context_cards" in response["data"]
    assert response["data"]["permissioned_context"] is True


def test_actions_draft_route(fake_state):
    response = asyncio.run(
        orb_operational_routes.operational_orb_actions_draft(
            OrbOperationalActionsDraftRequest(
                message="What actions should I prioritise?",
                mode="action_priority",
            ),
            conn=None,
            current_user=fake_state["user"],
        )
    )
    assert response["success"] is True
    assert "draft_actions" in response["data"]
    assert "not persisted" in response["data"]["notice"].lower()


def test_actions_create_route(fake_state, monkeypatch):
    monkeypatch.setattr(
        orb_operational_routes.orb_operational_action_builder_service,
        "create_actions_from_drafts",
        lambda drafts, user, **kwargs: {
            "created_ids": ["1"],
            "errors": [],
            "persistence_available": True,
            "notice": "proposed",
        },
    )
    response = asyncio.run(
        orb_operational_routes.operational_orb_actions_create(
            OrbOperationalActionsCreateRequest(
                drafts=[
                    OrbOperationalDraftAction(
                        title="Review item",
                        description="Desc",
                        priority="high",
                        review_required=True,
                    )
                ],
                home_id=10,
            ),
            conn=MagicMock(),
            current_user=fake_state["user"],
        )
    )
    assert response["success"] is True
    assert response["data"]["created_ids"]


def test_briefings_create_route(fake_state):
    response = asyncio.run(
        orb_operational_routes.operational_orb_briefings_create(
            OrbOperationalBriefingRequest(
                message="Create a manager briefing for today",
                mode="manager_daily_brief",
            ),
            conn=None,
            current_user=fake_state["user"],
        )
    )
    assert response["success"] is True
    assert response["data"]["briefing"] is not None
    assert response["data"]["persisted"] is False


def test_briefings_save_route(fake_state):
    response = asyncio.run(
        orb_operational_routes.operational_orb_briefings_save(
            OrbOperationalBriefingRequest(
                message="Manager briefing",
                mode="manager_daily_brief",
                save=True,
            ),
            conn=None,
            current_user=fake_state["user"],
        )
    )
    assert response["success"] is True
    assert response["data"]["export_payload"]
    assert response["data"]["saved_as_output_id"] is not None
    assert response["data"]["notice"] and "standalone" in response["data"]["notice"].lower()


def test_context_cards_paths_registered():
    from app import app
    from fastapi.routing import APIRoute

    paths = {route.path for route in app.router.routes if isinstance(route, APIRoute)}
    assert "/assistant/orb/context-cards" in paths
    assert "/api/assistant/orb/actions/draft" in paths
    assert "/api/assistant/orb/briefings/create" in paths
