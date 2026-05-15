from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from routers.document_os_route_utils import EvidencePayload
from services.provider_intelligence_service import ProviderIntelligenceService

router = APIRouter(prefix="/provider/intelligence", tags=["provider-intelligence"])

service = ProviderIntelligenceService()


@router.get("")
def provider_dashboard(
    days: int = 30,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.build_dashboard(current_user=current_user, days=days)


@router.post("/os-snapshot")
def provider_os_snapshot(
    payload: EvidencePayload,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.build_os_snapshot(records=payload.records, current_user=current_user)
