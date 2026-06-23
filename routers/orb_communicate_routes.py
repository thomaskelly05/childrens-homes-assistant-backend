"""ORB Communicate — backend convergence for accessible communication workflows."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_residential_dependencies import require_orb_residential_auth
from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_communicate_support_pack_service import (
    SupportPackRequest,
    orb_communicate_support_pack_service,
)

router = APIRouter(prefix="/orb/communicate", tags=["ORB Communicate"])

CommunicateAudienceField = Literal[
    "child",
    "young_person",
    "adult",
    "learning_disability",
    "autism",
    "unknown",
]


class OrbCommunicateConvergeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str = Field(..., min_length=1, max_length=20_000)
    mode: str | None = None
    workflow: str | None = None


class OrbCommunicateSupportPackRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    situation: str = Field(..., min_length=1, max_length=20_000)
    person_context: str | None = Field(default=None, max_length=10_000)
    communication_needs: str | None = Field(default=None, max_length=10_000)
    audience: CommunicateAudienceField = "young_person"
    pack_goal: str | None = Field(default=None, max_length=5_000)


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


@router.post("/support-pack")
async def communicate_support_pack(
    payload: OrbCommunicateSupportPackRequest,
    current_user=Depends(require_orb_residential_auth),
) -> dict[str, Any]:
    """Generate a Communication Support Pack through the canonical ORB brain convergence path."""
    _ = current_user
    request = SupportPackRequest(
        situation=payload.situation,
        person_context=payload.person_context,
        communication_needs=payload.communication_needs,
        audience=payload.audience,
        pack_goal=payload.pack_goal,
    )
    output = orb_communicate_support_pack_service.build_support_pack(request)
    return orb_communicate_support_pack_service.to_response_dict(output)
