from __future__ import annotations

from fastapi import APIRouter, Request

from routers.document_os_route_utils import EvidencePayload, user_from_request
from services.annex_a_generator_service import annex_a_generator_service


router = APIRouter(prefix="/api/inspection-os/annex-a", tags=["inspection-os"])


@router.post("/draft")
def generate_annex_a(payload: EvidencePayload, request: Request):
    return {"ok": True, "annex_a": annex_a_generator_service.generate(records=payload.records, current_user=user_from_request(request))}


@router.get("/demo")
def generate_annex_a_demo():
    records = [{"title": "Reg 44 action", "summary": "Manager should review safeguarding evidence gap and training follow-up."}]
    return {"ok": True, "annex_a": annex_a_generator_service.generate(records=records)}
