from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException

from auth.current_user import get_current_user
from db.connection import get_db
from services.referral_decision_service import ReferralDecisionService
from services.workflow_response import gold_standard_response

router = APIRouter(prefix="/referrals", tags=["Referral Decisions"])


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
        raise HTTPException(status_code=403, detail="You do not have permission to manage referrals")


def _decision_response(item: dict[str, Any], message: str) -> dict[str, Any]:
    return gold_standard_response(
        id=item.get("id"),
        item=item,
        message=message,
        workflow={"status": item.get("status"), "decision": item.get("manager_decision")},
        sync={"attempted": False, "reason": "pre_placement_referral_decision"},
        referral=item,
    )


@router.post("/{referral_id}/decision/accept-in-principle")
def accept_referral_in_principle(referral_id: int, payload: dict[str, Any] = Body(default={}), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    item = ReferralDecisionService.record_decision(conn, referral_id=referral_id, decision="accepted_in_principle", payload=payload, actor_user_id=_actor_id(current_user))
    return _decision_response(item, "Referral accepted in principle")


@router.post("/{referral_id}/decision/decline")
def decline_referral(referral_id: int, payload: dict[str, Any] = Body(default={}), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    item = ReferralDecisionService.record_decision(conn, referral_id=referral_id, decision="declined", payload=payload, actor_user_id=_actor_id(current_user))
    return _decision_response(item, "Referral declined")


@router.post("/{referral_id}/decision/request-more-information")
def request_more_referral_information(referral_id: int, payload: dict[str, Any] = Body(default={}), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    item = ReferralDecisionService.record_decision(conn, referral_id=referral_id, decision="more_information_requested", payload=payload, actor_user_id=_actor_id(current_user))
    return _decision_response(item, "More referral information requested")


@router.post("/{referral_id}/convert-with-evidence")
def convert_referral_with_evidence(referral_id: int, payload: dict[str, Any] = Body(...), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    home_id = _safe_int(payload.get("home_id"))
    if not home_id:
        raise HTTPException(status_code=400, detail="home_id is required to convert a referral")
    item = ReferralDecisionService.convert_with_evidence(conn, referral_id=referral_id, home_id=home_id, current_user=current_user, actor_user_id=_actor_id(current_user))
    return gold_standard_response(
        id=item.get("young_person", {}).get("id"),
        item=item,
        message="Referral converted into child journey with evidence",
        workflow={"status": "converted", "home_id": home_id},
        sync={"attempted": True, "ok": True, "reason": "created_profile_plans_documents_chronology"},
        referral_conversion=item,
    )
