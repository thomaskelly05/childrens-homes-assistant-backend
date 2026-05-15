from __future__ import annotations

from fastapi import APIRouter, Request

from routers.document_os_route_utils import EvidencePayload, user_from_request
from services.notification_escalation_service import notification_escalation_service


router = APIRouter(prefix="/api/oversight-os/escalations", tags=["oversight-os"])


@router.post("/draft")
def build_escalations(payload: EvidencePayload, request: Request):
    return {"ok": True, **notification_escalation_service.build(records=payload.records, current_user=user_from_request(request))}
