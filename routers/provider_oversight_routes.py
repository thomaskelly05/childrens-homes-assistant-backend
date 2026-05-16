from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from services.provider_oversight_service import provider_oversight_service

router = APIRouter(prefix="/api/provider", tags=["provider-oversight"])


@router.get("/oversight")
def provider_oversight(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return provider_oversight_service.build_overview(current_user=current_user)


@router.get("/governance")
def provider_governance(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return provider_oversight_service.category(current_user=current_user, category="unsigned_governance_actions")


@router.get("/inspection")
def provider_inspection(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return provider_oversight_service.category(current_user=current_user, category="inspection_gaps")


@router.get("/risk")
def provider_risk(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return provider_oversight_service.risk_summary(current_user=current_user)


@router.get("/operational-queues")
def provider_operational_queues(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return provider_oversight_service.build_overview(current_user=current_user)["queues"]
