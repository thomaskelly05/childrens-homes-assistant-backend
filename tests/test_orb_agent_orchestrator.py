from __future__ import annotations

import asyncio

import pytest

from schemas.orb_agents import OrbAgentRunRequest
from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service


SAMPLE = (
    "Daily notes should be factual and child-centred. Avoid attention seeking labels."
)


def test_document_analysis_agent_run():
    result = asyncio.run(
        orb_agent_orchestrator_service.run(
            OrbAgentRunRequest(
                agent_id="document_analysis",
                message="Create an action plan from this document",
                document_text=SAMPLE,
                document_title="Notes guidance",
                analysis_mode="action_plan",
            )
        )
    )
    assert result.agent_type == "document_analysis"
    assert result.standalone_only is True
    assert result.answer
    assert result.understanding
    assert result.context_used.get("document_analysis")


def test_unknown_agent_raises():
    with pytest.raises(ValueError):
        asyncio.run(
            orb_agent_orchestrator_service.run(
                OrbAgentRunRequest(agent_id="missing", message="hello")
            )
        )
