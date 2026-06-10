"""Founder OS bootstrap — single batched endpoint for founder page load."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.permissions import require_founder
from db.founder_persistence_db import sanitise_payload
from services.founder_bootstrap_service import build_founder_bootstrap

router = APIRouter(prefix="/founder-os", tags=["Founder Bootstrap"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": sanitise_payload(data)}


def _user_id(user: dict[str, Any]) -> int:
    return int(user.get("id") or 0)


@router.get("/bootstrap")
def founder_bootstrap(
    days: int = Query(default=30, ge=1, le=90),
    user=Depends(require_founder),
):
    payload = build_founder_bootstrap(user_id=_user_id(user), telemetry_days=days)
    return _success(payload)
