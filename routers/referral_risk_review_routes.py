from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from auth.current_user import get_current_user
from db.connection import get_db
from services.referral_risk_review_service import ReferralRiskReviewService
from services.workflow_response import gold_standard_response

router = APIRouter(prefix="/referrals", tags=["Referral Risk Review"])


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except Exception:
        return None


def _actor_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("id") or current_user.get("user_id") or current_user.get("sub"))


def _role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _assert_manager(current_user: dict[str, Any]) -> None:
    if _role(current_user) not in {"admin", "provider_admin", "manager", "registered_manager"}:
        raise HTTPException(status_code=403, detail="You do not have permission to review referral risks")


@router.get("/{referral_id}/risk-flags")
def list_referral_risk_flags(referral_id: int, status: str | None = Query(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    items = ReferralRiskReviewService.list_flags(conn, referral_id=referral_id, status=status)
    return {"ok": True, "items": items, "risk_flags": items, "count": len(items), "summary": ReferralRiskReviewService.summary(conn, referral_id=referral_id)}


@router.post("/{referral_id}/risk-flags/{flag_id}/review/{status}")
def review_referral_risk_flag(referral_id: int, flag_id: int, status: str, payload: dict[str, Any] = Body(default={}), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    try:
        item = ReferralRiskReviewService.review_flag(
            conn,
            referral_id=referral_id,
            flag_id=flag_id,
            status=status,
            payload=payload,
            actor_user_id=_actor_id(current_user),
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    return gold_standard_response(
        id=item.get("id"),
        item=item,
        message="Referral risk flag reviewed",
        workflow={"review_status": item.get("manager_review_status")},
        sync={"attempted": False, "reason": "pre_placement_risk_review"},
        risk_flag=item,
    )
