from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from auth.current_user import get_current_user
from db.connection import get_db
from services.referral_matching_service import ReferralMatchingService
from services.workflow_response import gold_standard_response

router = APIRouter(prefix="/referrals", tags=["Referral Matching Portal"])


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


@router.get("/health")
def referral_portal_health():
    return {"ok": True, "module": "referral_matching_portal", "status": "ready"}


@router.get("/capabilities")
def list_home_capabilities(home_id: int | None = Query(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    rows = ReferralMatchingService.list_capabilities(conn, home_id=home_id)
    return {"ok": True, "items": rows, "capabilities": rows, "count": len(rows)}


@router.put("/homes/{home_id}/capabilities")
def upsert_home_capabilities(home_id: int, payload: dict[str, Any] = Body(...), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    item = ReferralMatchingService.upsert_capability(conn, home_id=home_id, payload=payload, actor_user_id=_actor_id(current_user))
    return gold_standard_response(id=item.get("id"), item=item, message="Home referral capability updated", workflow={"status": "updated"}, sync={"attempted": False, "reason": "capability_matrix"}, capability=item)


@router.get("")
def list_referrals(status: str | None = Query(default=None), home_id: int | None = Query(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    rows = ReferralMatchingService.list_referrals(conn, status=status, home_id=home_id)
    return {"ok": True, "items": rows, "referrals": rows, "count": len(rows)}


@router.post("")
def create_referral(payload: dict[str, Any] = Body(...), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    item = ReferralMatchingService.create_referral(conn, payload=payload, actor_user_id=_actor_id(current_user))
    return gold_standard_response(id=item.get("id"), item=item, message="Referral created", workflow={"status": item.get("status")}, sync={"attempted": False, "reason": "pre_placement_referral"}, referral=item)


@router.get("/{referral_id}")
def get_referral(referral_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    try:
        item = ReferralMatchingService.get_referral(conn, referral_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Referral not found")
    return gold_standard_response(id=item.get("id"), item=item, message="Referral loaded", workflow={"status": item.get("status")}, sync={"attempted": False, "reason": "read_only"}, referral=item)


@router.post("/{referral_id}/documents")
def add_referral_document(referral_id: int, payload: dict[str, Any] = Body(...), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    item = ReferralMatchingService.add_document(conn, referral_id=referral_id, payload=payload, actor_user_id=_actor_id(current_user))
    return gold_standard_response(id=item.get("id"), item=item, message="Referral document added and scanned", workflow={"extraction_status": item.get("extraction_status")}, sync={"attempted": False, "reason": "referral_document_pre_placement"}, referral_document=item)


@router.post("/{referral_id}/score")
def score_referral_against_all_homes(referral_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    items = ReferralMatchingService.score_all_homes(conn, referral_id=referral_id, actor_user_id=_actor_id(current_user))
    return {"ok": True, "items": items, "matching_assessments": items, "count": len(items)}


@router.post("/{referral_id}/score/homes/{home_id}")
def score_referral_home(referral_id: int, home_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    item = ReferralMatchingService.score_home(conn, referral_id=referral_id, home_id=home_id, actor_user_id=_actor_id(current_user))
    return gold_standard_response(id=item.get("id"), item=item, message="Referral scored against home", workflow={"compatibility_status": item.get("compatibility_status")}, sync={"attempted": False, "reason": "matching_assessment"}, matching_assessment=item)


@router.post("/{referral_id}/convert")
def convert_referral_to_young_person(referral_id: int, payload: dict[str, Any] = Body(...), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_manager(current_user)
    home_id = _safe_int(payload.get("home_id"))
    if not home_id:
        raise HTTPException(status_code=400, detail="home_id is required to convert a referral")
    item = ReferralMatchingService.convert_to_young_person(conn, referral_id=referral_id, home_id=home_id, actor_user_id=_actor_id(current_user))
    return gold_standard_response(id=item.get("young_person", {}).get("id"), item=item, message="Referral converted into child journey", workflow={"status": "converted", "home_id": home_id}, sync={"attempted": True, "ok": True, "reason": "created_child_profile_care_plan_risk"}, referral_conversion=item)
