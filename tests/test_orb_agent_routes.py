from __future__ import annotations

import asyncio

import pytest

import routers.orb_agent_routes as agent_routes
from schemas.orb_agents import OrbAgentRunRequest, OrbDeepResearchRequest


def test_agents_health(fake_state):
    response = asyncio.run(agent_routes.agents_health(current_user=fake_state["user"]))
    assert response["success"] is True
    data = response["data"]
    assert data["standalone_only"] is True
    assert data["os_linked"] is False
    assert data["care_record_access"] is False
    assert data["live_web_retrieval_enabled"] is False
    assert data["agent_count"] >= 8


def test_list_agents(fake_state):
    response = asyncio.run(agent_routes.list_agents(current_user=fake_state["user"]))
    assert response["success"] is True
    agents = response["data"]
    assert isinstance(agents, list)
    assert all(a["standalone_only"] for a in agents)


def test_get_agent(fake_state):
    response = asyncio.run(
        agent_routes.get_agent("deep_research", current_user=fake_state["user"])
    )
    assert response["data"]["type"] == "deep_research"


@pytest.mark.asyncio
async def test_run_agent_route(fake_state, monkeypatch):
    from schemas.orb_agents import OrbAgentOutput, OrbAgentRunResponse

    async def stub_run(_request):
        return OrbAgentRunResponse(
            agent_type="manager_briefing",
            output=OrbAgentOutput(title="Briefing", body="## Summary\n\nTest", format="briefing"),
            safety_notice="Test notice",
        )

    monkeypatch.setattr(agent_routes.orb_agent_orchestrator_service, "run_agent", stub_run)

    response = await agent_routes.run_agent(
        OrbAgentRunRequest(prompt="create manager briefing on child voice"),
        current_user=fake_state["user"],
    )
    assert response["success"] is True
    assert response["data"]["agent_type"] == "manager_briefing"


@pytest.mark.asyncio
async def test_deep_research_route(fake_state, monkeypatch):
    from schemas.orb_agents import OrbAgentOutput, OrbDeepResearchResponse

    async def stub_deep(_request):
        return OrbDeepResearchResponse(
            query="test",
            depth="standard",
            output=OrbAgentOutput(title="Research", body="Briefing", format="briefing"),
            live_web_note="Live web retrieval is not enabled",
        )

    monkeypatch.setattr(agent_routes.orb_deep_research_service, "run_deep_research", stub_deep)

    response = await agent_routes.deep_research(
        OrbDeepResearchRequest(query="research Ofsted child voice"),
        current_user=fake_state["user"],
    )
    assert response["success"] is True
    assert "live web" in response["data"]["live_web_note"].lower()


def test_run_agent_rejects_operational_ids(fake_state):
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            agent_routes.run_agent(
                OrbAgentRunRequest(prompt="show child records", child_id=123),
                current_user=fake_state["user"],
            )
        )
    assert exc_info.value.status_code == 400
