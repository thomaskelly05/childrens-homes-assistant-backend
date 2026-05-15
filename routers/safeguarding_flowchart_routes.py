from __future__ import annotations

from fastapi import APIRouter, Request

from routers.document_os_route_utils import EvidencePayload, user_from_request
from services.contextual_safeguarding_service import contextual_safeguarding_service
from services.safeguarding_flowchart_service import safeguarding_flowchart_service


router = APIRouter(prefix="/api/safeguarding-os/flowchart", tags=["safeguarding-os"])


@router.get("/steps")
def flow_steps():
    return {"ok": True, "steps": safeguarding_flowchart_service.STEPS}


@router.post("/instances")
def start_flow(payload: EvidencePayload, request: Request):
    concern = payload.context or (payload.records[0] if payload.records else {})
    return {"ok": True, "flow": safeguarding_flowchart_service.start(concern=concern, current_user=user_from_request(request))}


@router.post("/contextual-map")
def contextual_map(payload: EvidencePayload):
    return {"ok": True, "map": contextual_safeguarding_service.map_context(records=payload.records)}
