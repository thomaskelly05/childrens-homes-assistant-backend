from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.current_user import get_current_user
from db.connection import get_db
from services.referral_final_hardening_service import ReferralFinalHardeningService
from services.workflow_response import gold_standard_response

router = APIRouter(prefix="/referrals", tags=["Referral Final Hardening"])


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
        raise HTTPException(status_code=403, detail="You do not have permission to review referrals")


@router.post("/{referral_id}/score-reviewed/homes/{home_id}")
def score_referral_home_reviewed(referral_id: int, home_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    item = ReferralFinalHardeningService.score_home_reviewed(conn, referral_id=referral_id, home_id=home_id, actor_user_id=_actor_id(current_user))
    return gold_standard_response(
        id=item.get("id"),
        item=item,
        message="Referral scored against home using manager-reviewed risks",
        workflow={"compatibility_status": item.get("compatibility_status")},
        sync={"attempted": False, "reason": "reviewed_matching_assessment"},
        matching_assessment=item,
    )


@router.get("/{referral_id}/evidence-review")
def referral_evidence_review(referral_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    item = ReferralFinalHardeningService.evidence_review(conn, referral_id=referral_id)
    return {"ok": True, "item": item, "evidence_review": item}


@router.get("/{referral_id}/qa-audit")
def referral_qa_audit(referral_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    return ReferralFinalHardeningService.qa_audit(conn, referral_id=referral_id)
