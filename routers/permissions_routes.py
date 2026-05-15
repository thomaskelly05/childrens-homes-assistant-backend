from __future__ import annotations

from fastapi import APIRouter, Request

from routers.document_os_route_utils import EvidencePayload, user_from_request
from services.permissions_engine_service import permissions_engine_service


router = APIRouter(prefix="/api/oversight-os/permissions", tags=["oversight-os"])


@router.post("/check")
def check_permission(payload: EvidencePayload, request: Request):
    return {"ok": True, "permission": permissions_engine_service.can_access(current_user=user_from_request(request), resource=payload.document or payload.context, action=payload.context.get("action", "read"))}
