from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

import routers.reg45_quality_review_routes as routes
from schemas.reg45_quality_review import Reg45ReviewActionRequest, Reg45ReviewCreateRequest


def test_health_route(fake_state):
    result = asyncio.run(routes.reg45_health(current_user=fake_state["user"], conn=None))
    assert result["success"] is True
    assert result["review_support_only"] is True


def test_dashboard_route(fake_state):
    result = asyncio.run(routes.reg45_dashboard(current_user=fake_state["user"], conn=None))
    assert result["success"] is True
    assert "draft_review_count" in result["data"]


def test_generate_route(fake_state):
    result = asyncio.run(
        routes.generate_reg45_review(
            body=Reg45ReviewCreateRequest(save_draft=True),
            current_user=fake_state["user"],
            conn=None,
        )
    )
    assert result["success"] is True
    assert result["data"]["sections"]


def test_list_and_get_route(fake_state):
    gen = asyncio.run(
        routes.generate_reg45_review(
            body=Reg45ReviewCreateRequest(save_draft=True),
            current_user=fake_state["user"],
            conn=None,
        )
    )
    review_id = gen["data"]["id"]
    listed = asyncio.run(routes.list_reg45_reviews(current_user=fake_state["user"], conn=None, limit=10))
    assert listed["success"] is True
    got = asyncio.run(
        routes.get_reg45_review(review_id=review_id, current_user=fake_state["user"], conn=None)
    )
    assert got["data"]["id"] == review_id


def test_action_and_export_route(fake_state):
    gen = asyncio.run(
        routes.generate_reg45_review(
            body=Reg45ReviewCreateRequest(save_draft=True),
            current_user=fake_state["user"],
            conn=None,
        )
    )
    review_id = gen["data"]["id"]
    action = asyncio.run(
        routes.reg45_review_action(
            review_id=review_id,
            body=Reg45ReviewActionRequest(action="mark_ready_for_manager_review"),
            current_user=fake_state["user"],
            conn=None,
        )
    )
    assert action["success"] is True
    exported = asyncio.run(
        routes.export_reg45_review(review_id=review_id, current_user=fake_state["user"], conn=None)
    )
    assert "markdown" in exported["data"]


def test_create_actions_route(fake_state):
    gen = asyncio.run(
        routes.generate_reg45_review(
            body=Reg45ReviewCreateRequest(save_draft=True),
            current_user=fake_state["user"],
            conn=None,
        )
    )
    result = asyncio.run(
        routes.create_reg45_actions(
            review_id=gen["data"]["id"],
            current_user=fake_state["user"],
            conn=None,
        )
    )
    assert "action_ids" in result["data"]


def test_auth_required_for_non_manager(fake_state):
    user = {**fake_state["user"], "role": "carer"}
    with pytest.raises(HTTPException) as exc:
        routes._ensure_manager_access(user)
    assert exc.value.status_code == 403
