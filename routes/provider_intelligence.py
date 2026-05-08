from __future__ import annotations

from fastapi import APIRouter

from services.indicare_provider_intelligence import (
    inspection_readiness_score,
    provider_overview,
)

router = APIRouter(prefix="/provider", tags=["provider-intelligence"])


@router.get("/overview")
def get_provider_overview() -> dict:
    return provider_overview()


@router.get("/inspection-readiness")
def get_inspection_readiness(home_id: str | None = None) -> dict:
    return inspection_readiness_score(home_id)
