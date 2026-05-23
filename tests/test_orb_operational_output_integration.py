from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from routers import orb_operational_routes
from schemas.orb_operational import (
    OrbOperationalActionsCreateRequest,
    OrbOperationalBriefingRequest,
    OrbOperationalDraftAction,
    OrbOperationalRequest,
    OrbOperationalResponse,
    OrbOperationalContextSummary,
    OrbOperationalPermissionSummary,
    OrbOperationalSafetyBoundary,
    OrbOperationalBriefing,
)
from services.orb_operational_output_service import orb_operational_output_service


@pytest.fixture(autouse=True)
def memory_outputs(monkeypatch):
    orb_operational_output_service._memory = {}
    monkeypatch.setattr(orb_operational_output_service, "_detect_storage_mode", lambda: "memory")


def test_operational_response_save_available(fake_state, monkeypatch):
    response = OrbOperationalResponse(
        answer="Answer",
        context_summary=OrbOperationalContextSummary(),
        permissions=OrbOperationalPermissionSummary(),
        boundaries=OrbOperationalSafetyBoundary(),
        briefing=OrbOperationalBriefing(title="Brief", summary="Sum"),
        save_available=True,
        suggested_output_type="manager_briefing",
    )
    monkeypatch.setattr(
        orb_operational_routes.orb_operational_assistant_service,
        "answer",
        AsyncMock(return_value=response),
    )
    monkeypatch.setattr(
        orb_operational_routes.orb_intelligence_bridge_service,
        "audit_operational_intelligence_use",
        lambda *_a, **_k: "audit-1",
    )

    result = asyncio.run(
        orb_operational_routes.operational_orb_conversation(
            OrbOperationalRequest(message="Briefing", mode="manager_daily_brief"),
            conn=MagicMock(),
            current_user=fake_state["user"],
        )
    )
    assert result["data"]["save_available"] is True


def test_save_output_true_creates_output(fake_state, monkeypatch):
    base = OrbOperationalResponse(
        answer="Answer",
        context_summary=OrbOperationalContextSummary(),
        permissions=OrbOperationalPermissionSummary(),
        boundaries=OrbOperationalSafetyBoundary(),
        briefing=OrbOperationalBriefing(title="Brief", summary="Sum"),
    )

    async def _answer(request, user, conn=None):
        from schemas.orb_operational import OrbOperationalOutputSaveContext

        if request.save_output:
            record = orb_operational_output_service.save_from_operational_response(
                base, request, user, conn=conn
            )
            base.operational_output = OrbOperationalOutputSaveContext(
                available=True,
                saved=True,
                output_id=record.id,
                type=record.type,
                review_status=record.review_status,
                visibility=record.visibility,
            )
        return base

    monkeypatch.setattr(
        orb_operational_routes.orb_operational_assistant_service,
        "answer",
        _answer,
    )
    monkeypatch.setattr(
        orb_operational_routes.orb_intelligence_bridge_service,
        "audit_operational_intelligence_use",
        lambda *_a, **_k: None,
    )

    result = asyncio.run(
        orb_operational_routes.operational_orb_conversation(
            OrbOperationalRequest(
                message="Save briefing",
                mode="manager_daily_brief",
                save_output=True,
            ),
            conn=MagicMock(),
            current_user=fake_state["user"],
        )
    )
    assert result["data"]["operational_output"]["saved"] is True
    assert result["data"]["operational_output"]["output_id"]


def test_briefing_save_persists(fake_state, monkeypatch):
    monkeypatch.setattr(
        orb_operational_routes.orb_operational_context_bridge,
        "build_context",
        lambda *_a, **_k: {"summary": OrbOperationalContextSummary(), "raw_available": True},
    )
    monkeypatch.setattr(
        orb_operational_routes.orb_operational_action_builder_service,
        "build_briefing",
        lambda *_a, **_k: OrbOperationalBriefing(title="Brief", summary="Sum"),
    )
    monkeypatch.setattr(
        orb_operational_routes.orb_operational_context_bridge,
        "_permission_summary",
        lambda *_a, **_k: OrbOperationalPermissionSummary(role="admin"),
    )

    result = asyncio.run(
        orb_operational_routes.operational_orb_briefings_save(
            OrbOperationalBriefingRequest(message="Briefing", save=True),
            conn=MagicMock(),
            current_user=fake_state["user"],
        )
    )
    assert result["data"]["saved_as_output_id"] is not None


def test_actions_create_links_output(fake_state, monkeypatch):
    monkeypatch.setattr(
        orb_operational_routes.orb_operational_action_builder_service,
        "create_actions_from_drafts",
        lambda *_a, **_k: {"created_ids": ["action-1"], "errors": []},
    )
    record = orb_operational_output_service.create_output(
        __import__(
            "schemas.orb_operational_outputs",
            fromlist=["OrbOperationalOutputCreate"],
        ).OrbOperationalOutputCreate(title="Plan", type="action_priority_plan"),
        fake_state["user"],
    )

    result = asyncio.run(
        orb_operational_routes.operational_orb_actions_create(
            OrbOperationalActionsCreateRequest(
                drafts=[
                    OrbOperationalDraftAction(title="A", description="B"),
                ],
                output_id=record.id,
            ),
            conn=MagicMock(),
            current_user=fake_state["user"],
        )
    )
    assert result["data"]["linked_output_id"] == record.id
    assert "action-1" in result["data"]["linked_action_ids"]
