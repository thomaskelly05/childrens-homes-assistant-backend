"""Standalone ORB agent framework API — no OS record access."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.permissions import require_assistant_access
from schemas.orb_agents import OrbAgentRunRequest
from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service
from services.orb_agent_registry_service import orb_agent_registry_service

router = APIRouter(prefix="/orb/standalone/agents", tags=["ORB Standalone Agents"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


@router.get("/health")
async def agents_health(current_user=Depends(require_assistant_access)):
    agents = orb_agent_registry_service.list_agents()
    return _success(
        {
            "status": "ready",
            "agent_count": len(agents),
            "standalone_only": True,
            "os_linked": False,
            "care_record_access": False,
        }
    )


@router.get("")
async def list_agents(current_user=Depends(require_assistant_access)):
    agents = orb_agent_registry_service.list_agents()
    return _success([agent.model_dump() for agent in agents])


@router.get("/{agent_id}")
async def get_agent(agent_id: str, current_user=Depends(require_assistant_access)):
    agent = orb_agent_registry_service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return _success(agent.model_dump())


@router.post("/run")
async def run_agent(
    payload: OrbAgentRunRequest,
    current_user=Depends(require_assistant_access),
):
    forbidden = (
        "child_id",
        "young_person_id",
        "staff_id",
        "home_id",
        "record_id",
        "chronology_id",
    )
    raw = payload.model_dump()
    for key in forbidden:
        if raw.get(key) is not None:
            raise HTTPException(
                status_code=400,
                detail=f"Standalone agents must not receive {key}.",
            )
    try:
        result = await orb_agent_orchestrator_service.run(payload)
        return _success(result.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
