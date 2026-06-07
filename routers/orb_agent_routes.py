"""Standalone ORB specialist agent API — no OS record access."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from schemas.orb_agents import OrbAgentRunRequest, OrbAgentType, OrbDeepResearchRequest
from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service
from services.orb_agent_registry_service import orb_agent_registry_service
from services.orb_deep_research_service import orb_deep_research_service
from services.ai_provider_registry import ai_provider_registry
from services.orb_standalone_boundary import FORBIDDEN_STANDALONE_OS_KEYS

logger = logging.getLogger("indicare.orb_agent_routes")

router = APIRouter(prefix="/orb/standalone/agents", tags=["ORB Standalone Agents"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def _error(message: str, *, status: int = 400) -> None:
    raise HTTPException(status_code=status, detail={"success": False, "error": message})


@router.get("/health")
async def agents_health(current_user=Depends(require_standalone_orb_access)):
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
async def list_agents(current_user=Depends(require_standalone_orb_access)):
    agents = orb_agent_registry_service.list_agents()
    return _success([agent.model_dump() for agent in agents])


@router.get("/{agent_type}")
async def get_agent(agent_type: OrbAgentType, current_user=Depends(require_standalone_orb_access)):
    agent = orb_agent_registry_service.get_agent(agent_type)
    if not agent:
        _error(f"Unknown agent type: {agent_type}", status=404)
    return _success(agent.model_dump())


@router.post("/run")
async def run_agent(
    payload: OrbAgentRunRequest,
    current_user=Depends(require_standalone_orb_access),
):
    if payload.agent_type and not orb_agent_registry_service.agent_available(payload.agent_type):
        _error(f"Agent unavailable: {payload.agent_type}", status=404)

    for key in FORBIDDEN_STANDALONE_OS_KEYS:
        if getattr(payload, key, None) is not None:
            _error("Standalone ORB agents must not receive OS record identifiers.")

    result = await orb_agent_orchestrator_service.run_agent(payload)
    return _success(result.model_dump())


@router.post("/deep-research")
async def deep_research(
    payload: OrbDeepResearchRequest,
    current_user=Depends(require_standalone_orb_access),
):
    for key in FORBIDDEN_STANDALONE_OS_KEYS:
        if getattr(payload, key, None) is not None:
            _error("Standalone ORB deep research must not receive OS record identifiers.")

    result = await orb_deep_research_service.run_deep_research(payload)
    return _success(result.model_dump())
