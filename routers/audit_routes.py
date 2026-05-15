from __future__ import annotations

from fastapi import APIRouter, Request

from routers.document_os_route_utils import EvidencePayload, user_from_request
from services.decision_accountability_service import decision_accountability_service
from services.forensic_audit_service import forensic_audit_service


router = APIRouter(prefix="/api/oversight-os/audit", tags=["oversight-os"])


@router.post("/event")
def audit_event(payload: EvidencePayload, request: Request):
    return {"ok": True, "event": forensic_audit_service.event(action=payload.context.get("action", "review"), actor=user_from_request(request), resource=payload.document, metadata=payload.context)}


@router.post("/decision")
def decision(payload: EvidencePayload, request: Request):
    return {
        "ok": True,
        "decision": decision_accountability_service.record_decision(
            suggestion=payload.context.get("suggestion", {}),
            decision=payload.decision or "reviewed",
            rationale=payload.rationale or "Human review recorded.",
            evidence=payload.records,
            current_user=user_from_request(request),
        ),
    }
