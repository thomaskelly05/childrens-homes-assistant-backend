from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from schemas.ai_models import AiProviderName, AiProviderResponse, AiRoutingDecision, AiTaskType, AiModelRouterTrace, AiRiskLevel, AiQualityTier, AiCostTier
from schemas.orb_operational import OrbOperationalRequest
from services.orb_operational_assistant_service import orb_operational_assistant_service


@pytest.mark.asyncio
async def test_operational_assistant_uses_model_router(monkeypatch):
    decision = AiRoutingDecision(
        provider=AiProviderName.MOCK,
        model="mock-text",
        task_type=AiTaskType.OPERATIONAL_OS_CONTEXT,
        risk_level=AiRiskLevel.MEDIUM,
        quality_tier=AiQualityTier.BALANCED,
        cost_tier=AiCostTier.STANDARD,
        reason="test",
    )
    trace = AiModelRouterTrace(
        task_type=AiTaskType.OPERATIONAL_OS_CONTEXT,
        risk_level=AiRiskLevel.MEDIUM,
        quality_tier=AiQualityTier.BALANCED,
        cost_tier=AiCostTier.STANDARD,
        provider=AiProviderName.MOCK,
        model="mock-text",
        reason="test",
    )
    response = AiProviderResponse(text="Focus on manager review items today.", provider=AiProviderName.MOCK, model="mock-text")

    monkeypatch.setattr(
        "services.orb_operational_assistant_service.ai_model_router_service.complete_with_routing",
        AsyncMock(return_value=(response, decision, trace)),
    )
    monkeypatch.setattr(
        "services.orb_operational_assistant_service.orb_operational_context_bridge.build_context",
        lambda *_args, **_kwargs: {
            "summary": {
                "headline": "Summary ready",
                "attention_items": ["Review safeguarding note"],
                "degraded": False,
                "unavailable": False,
            },
            "sources": [{"label": "Manager daily brief", "source_type": "registered_manager_daily_brief", "basis": "Brief"}],
            "permissions": {"role": "manager", "care_record_access": True, "allowed_home_ids": [1]},
            "raw_available": True,
        },
    )

    result = await orb_operational_assistant_service.answer(
        OrbOperationalRequest(message="What needs my attention today?", mode="manager_daily_brief"),
        {"id": 1, "role": "manager", "home_id": 1},
        conn=MagicMock(),
    )

    assert result.os_linked is True
    assert result.standalone_only is False
    assert result.permissioned_context is True
    assert result.intelligence_output is not None
    assert result.model_routing is not None
    assert result.boundaries.no_ofsted_grade_predictions is True
    assert "manager review" in result.answer.lower() or "Review" in result.answer
    assert result.context_cards is not None
    assert result.audit_summary is not None
    assert result.context_status is not None


@pytest.mark.asyncio
async def test_operational_assistant_fallback_when_router_fails(monkeypatch):
    monkeypatch.setattr(
        "services.orb_operational_assistant_service.ai_model_router_service.complete_with_routing",
        AsyncMock(side_effect=RuntimeError("router down")),
    )
    monkeypatch.setattr(
        "services.orb_operational_assistant_service.orb_operational_context_bridge.build_context",
        lambda *_args, **_kwargs: {
            "summary": {"unavailable": True, "headline": "Unavailable"},
            "sources": [],
            "permissions": {"care_record_access": False},
            "raw_available": False,
        },
    )

    result = await orb_operational_assistant_service.answer(
        OrbOperationalRequest(message="Safeguarding themes?", mode="safeguarding_themes"),
        {"id": 2, "role": "staff"},
        conn=None,
    )

    assert "temporarily unavailable" in result.answer.lower() or "manager" in result.answer.lower()
    assert result.warnings


@pytest.mark.asyncio
async def test_operational_assistant_includes_draft_actions_for_action_prompt(monkeypatch):
    decision = AiRoutingDecision(
        provider=AiProviderName.MOCK,
        model="mock-text",
        task_type=AiTaskType.OPERATIONAL_OS_CONTEXT,
        risk_level=AiRiskLevel.MEDIUM,
        quality_tier=AiQualityTier.BALANCED,
        cost_tier=AiCostTier.STANDARD,
        reason="test",
    )
    trace = AiModelRouterTrace(
        task_type=AiTaskType.OPERATIONAL_OS_CONTEXT,
        risk_level=AiRiskLevel.MEDIUM,
        quality_tier=AiQualityTier.BALANCED,
        cost_tier=AiCostTier.STANDARD,
        provider=AiProviderName.MOCK,
        model="mock-text",
        reason="test",
    )
    response = AiProviderResponse(text="Prioritise safeguarding follow-up.", provider=AiProviderName.MOCK, model="mock-text")

    monkeypatch.setattr(
        "services.orb_operational_assistant_service.ai_model_router_service.complete_with_routing",
        AsyncMock(return_value=(response, decision, trace)),
    )
    monkeypatch.setattr(
        "services.orb_operational_assistant_service.orb_operational_context_bridge.build_context",
        lambda *_args, **_kwargs: {
            "summary": {
                "headline": "Actions",
                "attention_items": ["Review plan"],
                "degraded": False,
                "unavailable": False,
            },
            "sources": [],
            "permissions": {"role": "manager", "care_record_access": True},
            "raw_available": True,
        },
    )

    result = await orb_operational_assistant_service.answer(
        OrbOperationalRequest(message="What actions should I prioritise?", mode="action_priority"),
        {"id": 1, "role": "manager"},
        conn=MagicMock(),
    )
    assert result.draft_actions
    assert result.recommendations
