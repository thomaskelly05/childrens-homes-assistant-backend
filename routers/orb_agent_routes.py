"""Standalone ORB specialist agent API — no OS record access."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.permissions import require_assistant_access
from schemas.orb_agents import OrbAgentRunRequest, OrbAgentType, OrbDeepResearchRequest
from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service
from services.orb_agent_registry_service import orb_agent_registry_service
from services.orb_deep_research_service import orb_deep_research_service
from services.ai_provider_registry import ai_provider_registry

logger = logging.getLogger("indicare.orb_agent_routes")

router = APIRouter(prefix="/orb/standalone/agents", tags=["ORB Standalone Agents"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def _error(message: str, *, status: int = 400) -> None:
    raise HTTPException(status_code=status, detail={"success": False, "error": message})


@router.get("/health")
async def agents_health(current_user=Depends(require_assistant_access)):
    from schemas.orb_agents import OrbAgentHealth

    agents = orb_agent_registry_service.list_agents()
    health = OrbAgentHealth(
        status="ready",
        agent_count=len(agents),
        standalone_only=True,
        os_linked=False,
        care_record_access=False,
        live_web_retrieval_enabled=False,
        knowledge_library_available=True,
        model_router_available=bool(ai_provider_registry.health_payload().get("available")),
    )
    return _success(health.model_dump())


@router.get("")
async def list_agents(current_user=Depends(require_assistant_access)):
    agents = orb_agent_registry_service.list_agents()
    return _success([agent.model_dump() for agent in agents])


@router.get("/{agent_type}")
async def get_agent(agent_type: OrbAgentType, current_user=Depends(require_assistant_access)):
    agent = orb_agent_registry_service.get_agent(agent_type)
    if not agent:
        _error(f"Unknown agent type: {agent_type}", status=404)
    return _success(agent.model_dump())


@router.post("/run")
async def run_agent(
    payload: OrbAgentRunRequest,
    current_user=Depends(require_assistant_access),
):
    if payload.agent_type and not orb_agent_registry_service.agent_available(payload.agent_type):
        _error(f"Agent unavailable: {payload.agent_type}", status=404)

    forbidden_ids = (
        "child_id",
        "young_person_id",
        "staff_id",
        "home_id",
        "record_id",
        "chronology_id",
    )
    lower_prompt = payload.prompt.lower()
    for key in forbidden_ids:
        if f"{key}=" in lower_prompt or f'"{key}"' in lower_prompt:
            _error(f"Standalone agents cannot accept operational identifiers ({key}).", status=400)

    try:
        result = await orb_agent_orchestrator_service.run_agent(payload)
        return _success(result.model_dump())
    except Exception as exc:
        logger.warning("agent run route failed: %s", type(exc).__name__, exc_info=True)
        _error("Agent run failed", status=503)


@router.post("/deep-research")
async def deep_research(
    payload: OrbDeepResearchRequest,
    current_user=Depends(require_assistant_access),
):
    try:
        result = await orb_deep_research_service.run_deep_research(payload)
        return _success(result.model_dump())
    except Exception as exc:
        logger.warning("deep research route failed: %s", type(exc).__name__, exc_info=True)
        _error("Deep research failed", status=503)
