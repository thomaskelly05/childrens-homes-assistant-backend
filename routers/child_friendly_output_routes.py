from __future__ import annotations

from fastapi import APIRouter

from routers.document_os_route_utils import EvidencePayload
from services.child_friendly_output_service import child_friendly_output_service


router = APIRouter(prefix="/api/document-os/child-friendly", tags=["documents-os"])


@router.post("/draft")
def draft_output(payload: EvidencePayload):
    return {"ok": True, "output": child_friendly_output_service.generate(records=payload.records, output_type=payload.output_type or "my_plan")}
