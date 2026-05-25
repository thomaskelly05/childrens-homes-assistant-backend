from __future__ import annotations

import asyncio

import pytest

from routers import handover_intelligence_routes as routes


def test_health_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(routes.handover_health(current_user=user, conn=None))
    assert result["success"] is True
    assert result["metadata_only"] is True
    assert result["data"]["service"] == "handover_intelligence_service"


def test_intelligence_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(routes.handover_intelligence(current_user=user, conn=None))
    assert result["success"] is True
    assert result["standalone_access"] is False
    assert "sections" in result["data"]


def test_drafts_crud_route(fake_state):
    user = fake_state["user"]
    from schemas.handover_drafts import HandoverDraftRequest

    created = asyncio.run(
        routes.create_handover_draft(
            body=HandoverDraftRequest(title="Route test"),
            current_user=user,
            conn=None,
        )
    )
    draft_id = created["data"]["draft_id"]
    listed = asyncio.run(routes.list_handover_drafts(current_user=user, conn=None, limit=50))
    assert listed["success"] is True
    got = asyncio.run(
        routes.get_handover_draft(draft_id=draft_id, current_user=user, conn=None)
    )
    assert got["data"]["id"] == draft_id
    ready = asyncio.run(
        routes.handover_draft_ready_for_review(
            draft_id=draft_id, current_user=user, conn=None
        )
    )
    assert ready["data"]["status"] == "ready_for_review"


def test_routes_registered():
    paths = {getattr(r, "path", "") for r in routes.router.routes}
    assert "/handover/health" in paths
    assert "/handover/intelligence" in paths
    assert "/handover/drafts" in paths
