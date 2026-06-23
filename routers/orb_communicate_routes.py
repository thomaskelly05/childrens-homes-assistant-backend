"""ORB Communicate — backend convergence for accessible communication workflows."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_residential_dependencies import require_orb_residential_auth
from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service

router = APIRouter(prefix="/orb/communicate", tags=["ORB Communicate"])


class OrbCommunicateConvergeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str = Field(..., min_length=1, max_length=20_000)
    mode: str | None = None
    workflow: str | None = None


@router.post("/converge")
async def communicate_converge(
    payload: OrbCommunicateConvergeRequest,
    current_user=Depends(require_orb_residential_auth),
) -> dict[str, Any]:
    """Return canonical orchestrator convergence metadata for Communicate workflows."""
    _ = current_user
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(
        payload.text,
        mode=payload.mode or "Communicate",
        feature="communicate",
        source_surface="communicate",
        route="/orb/communicate/converge",
    )
    convergence = orb_brain_convergence_orchestrator_service.convergence_metadata(
        decision,
        route="/orb/communicate/converge",
    )
    return {
        "success": True,
        "workflow": payload.workflow,
        "brain_convergence": convergence,
        "active_final_domains": convergence.get("active_final_domains") or [],
        "public_source_chips": convergence.get("public_source_chips") or [],
        "source_anchors": convergence.get("source_anchors") or [],
        "standalone_boundary": True,
    }
