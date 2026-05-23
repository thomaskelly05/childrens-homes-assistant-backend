from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

import routers.orb_agent_routes as agent_routes
from schemas.orb_agents import OrbAgentRunRequest


def test_agents_health(fake_state):
    response = asyncio.run(agent_routes.agents_health(current_user=fake_state["user"]))
    assert response["success"] is True
    assert response["data"]["standalone_only"] is True


def test_list_agents_route(fake_state):
    response = asyncio.run(agent_routes.list_agents(current_user=fake_state["user"]))
    assert response["success"] is True
    ids = [a["id"] for a in response["data"]]
    assert "document_analysis" in ids


def test_run_document_agent(fake_state):
    response = asyncio.run(
        agent_routes.run_agent(
            OrbAgentRunRequest(
                agent_id="document_analysis",
                message="Summarise this document",
                document_text="Child-centred daily notes with factual description.",
                document_title="Guide",
                analysis_mode="summarise",
            ),
            current_user=fake_state["user"],
        )
    )
    assert response["success"] is True
    assert response["data"]["agent_type"] == "document_analysis"
    assert response["data"]["sources"] is not None


def test_agent_router_registered():
    loader = Path(__file__).resolve().parents[1] / "core" / "router_loader.py"
    assert "routers.orb_agent_routes" in loader.read_text(encoding="utf-8")
