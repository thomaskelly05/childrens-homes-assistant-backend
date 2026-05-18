from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from auth.current_user import get_current_user
from db.connection import get_db
from services.record_versioning_service import record_versioning_service
from services.workflow_response import gold_standard_response, sync_not_observed
from services.young_people_linking_service import YoungPeopleLinkingService
from services.young_person_plans_service import YoungPersonPlansService

router = APIRouter(prefix="/young-people", tags=["Young People Plans"])


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _user_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id"))


def _user_role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _assert_home_access(current_user: dict[str, Any], record_home_id: int | None) -> None:
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    if role in {"admin", "provider_admin"}:
        return

    if record_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified")

    if user_home_id != record_home_id:
        raise HTTPException(status_code=403, detail="You do not have access to this young person")


def _assert_can_edit(current_user: dict[str, Any]) -> None:
    role = _user_role(current_user)
    if role not in {"admin", "provider_admin", "manager", "staff"}:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this record")


def _assert_can_review(current_user: dict[str, Any]) -> None:
    role = _user_role(current_user)
    if role not in {"admin", "provider_admin", "manager"}:
        raise HTTPException(status_code=403, detail="You do not have permission to review this record")


def _load_and_check_young_person(conn, young_person_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    person = YoungPersonPlansService.ensure_young_person_exists(conn, young_person_id)
    _assert_home_access(current_user, _safe_int(person.get("home_id")))
    return person


def _load_and_check_plan(conn, plan_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    row = YoungPersonPlansService.fetch_plan_by_id(conn, plan_id)
    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


def _plan_gold_response(
    conn,
    *,
    plan_id: int,
    result: dict[str, Any] | None = None,
    workflow: Any | None = None,
    versioned: Any | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    result = result or {}
    item = YoungPersonPlansService.get_support_plan(conn, plan_id)
    workflow_payload = workflow if workflow is not None else result.get("workflow") or {}
    sync_payload = result.get("sync") or sync_not_observed()
    return gold_standard_response(
        id=plan_id,
        item=item,
        message=message or result.get("message"),
        workflow=workflow_payload,
        sync=sync_payload,
        versioned=versioned if versioned is not None else result.get("versioned"),
        support_plan=item,
        legacy=result,
    )


def _link_support_plan_update(conn, *, plan_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    plan = YoungPersonPlansService.get_support_plan(conn, plan_id)
    workflow = YoungPeopleLinkingService.process_record_event(
        conn=conn,
        young_person_id=int(plan["young_person_id"]),
        source_table="support_plans",
        source_id=plan_id,
        event_type="updated",
        title=f"{plan.get('title') or 'Support plan'} updated",
        summary=plan.get("summary") or plan.get("presenting_need") or "Support plan updated",
        narrative="\n".join(
            str(value)
            for value in [
                plan.get("summary"),
                plan.get("presenting_need"),
                plan.get("child_voice"),
                plan.get("proactive_strategies"),
                plan.get("pace_guidance"),
                plan.get("triggers"),
                plan.get("protective_factors"),
            ]
            if value
        ) or "Support plan updated",
        category="support_plan",
        subcategory=plan.get("plan_type") or "support_plan",
        significance="medium",
        review_date=plan.get("review_date"),
        due_date=plan.get("review_date"),
        owner_id=plan.get("owner_id"),
        created_by=_safe_int(current_user.get("user_id") or current_user.get("id")),
        workflow={
            "link_chronology": True,
            "create_task": bool(plan.get("review_date")),
            "manager_review": True,
            "safeguarding": False,
            "link_support_plans": False,
            "link_monthly_reviews": True,
            "link_quality_standards": True,
        },
        metadata={
            "severity": "medium",
            "workflow_status": plan.get("workflow_status") or plan.get("approval_status") or plan.get("status"),
            "quality_standards": ["protection_of_children"],
            "standards_rationale": "Support plan updated and linked for review",
            "evidence_strength": "strong",
            "response_actions": plan.get("proactive_strategies"),
            "judgement_areas": ["helped_and_protected"],
        },
    )
    conn.commit()
    return workflow


class SupportPlanCreatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    plan_type: str = "support_plan"
    title: str

    presenting_need: str | None = None
    summary: str | None = None
    child_voice: str | None = None
    proactive_strategies: str | None = None
    pace_guidance: str | None = None
    triggers: str | None = None
    protective_factors: str | None = None
    start_date: str | None = None
    review_date: str | None = None

    status: str | None = "draft"
    owner_id: int | None = None
    approval_status: str | None = "draft"
    created_by: int | None = None
    archived: bool | None = False

    staff_guidance: str | None = Field(default=None, alias="staff_guidance")
    formulation: str | None = Field(default=None, alias="formulation")


class SupportPlanUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    plan_type: str | None = None
    title: str | None = None
    presenting_need: str | None = None
    summary: str | None = None
    child_voice: str | None = None
    proactive_strategies: str | None = None
    pace_guidance: str | None = None
    triggers: str | None = None
    protective_factors: str | None = None
    start_date: str | None = None
    review_date: str | None = None
    status: str | None = None
    owner_id: int | None = None
    approval_status: str | None = None
    created_by: int | None = None
    archived: bool | None = None

    staff_guidance: str | None = Field(default=None, alias="staff_guidance")
    formulation: str | None = Field(default=None, alias="formulation")


class ReviewDecisionPayload(BaseModel):
    review_note: str | None = None


@router.get("/{young_person_id}/plans")
def list_plans(young_person_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonPlansService.list_plans_for_young_person(conn, young_person_id=young_person_id, archived=False)
    return {"items": rows, "count": len(rows)}


@router.get("/{young_person_id}/plans/archive")
def list_archived_plans(young_person_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonPlansService.list_plans_for_young_person(conn, young_person_id=young_person_id, archived=True)
    return {"items": rows, "count": len(rows)}


@router.get("/plans/{plan_id}")
def get_support_plan(plan_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_plan(conn, plan_id, current_user)
    return YoungPersonPlansService.get_support_plan(conn, plan_id)


@router.post("/{young_person_id}/plans")
def create_support_plan(young_person_id: int, payload: SupportPlanCreatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)
    result = YoungPersonPlansService.create_support_plan(conn, young_person_id=young_person_id, payload=payload.model_dump(exclude_none=True, by_alias=False), actor_user_id=_safe_int(current_user.get("user_id")), linking_service=YoungPeopleLinkingService)
    plan_id = _safe_int(result.get("id") if isinstance(result, dict) else None)
    if not plan_id:
        return result
    return _plan_gold_response(conn, plan_id=plan_id, result=result, message="Support plan created")


@router.patch("/plans/{plan_id}")
@router.put("/plans/{plan_id}")
def update_support_plan(plan_id: int, payload: SupportPlanUpdatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    before = _load_and_check_plan(conn, plan_id, current_user)
    result = YoungPersonPlansService.update_support_plan(conn, plan_id=plan_id, payload=payload.model_dump(exclude_unset=True, by_alias=False))
    after = YoungPersonPlansService.get_support_plan(conn, plan_id)
    versioned = record_versioning_service.capture_version(
        conn,
        source_table="support_plans",
        source_id=plan_id,
        before=before,
        after=after,
        changed_by=_safe_int(current_user.get("user_id") or current_user.get("id")),
        change_reason="support_plan_updated",
    )
    workflow = _link_support_plan_update(conn, plan_id=plan_id, current_user=current_user)
    return _plan_gold_response(conn, plan_id=plan_id, result=result, workflow=workflow, versioned=versioned, message="Support plan updated")


@router.post("/plans/{plan_id}/submit")
@router.put("/plans/{plan_id}/submit")
def submit_support_plan(plan_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_plan(conn, plan_id, current_user)
    result = YoungPersonPlansService.submit_support_plan(conn, plan_id=plan_id, actor_user_id=_safe_int(current_user.get("user_id")), linking_service=YoungPeopleLinkingService)
    return _plan_gold_response(conn, plan_id=plan_id, result=result, message="Support plan submitted")


@router.post("/plans/{plan_id}/approve")
@router.put("/plans/{plan_id}/approve")
def approve_support_plan(plan_id: int, payload: ReviewDecisionPayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_review(current_user)
    _load_and_check_plan(conn, plan_id, current_user)
    result = YoungPersonPlansService.approve_support_plan(conn, plan_id=plan_id, approved_by=_safe_int(current_user.get("user_id")), review_note=payload.review_note, linking_service=YoungPeopleLinkingService)
    return _plan_gold_response(conn, plan_id=plan_id, result=result, message="Support plan approved")


@router.post("/plans/{plan_id}/return")
@router.put("/plans/{plan_id}/return")
def return_support_plan(plan_id: int, payload: ReviewDecisionPayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_review(current_user)
    _load_and_check_plan(conn, plan_id, current_user)
    result = YoungPersonPlansService.return_support_plan(conn, plan_id=plan_id, actor_user_id=_safe_int(current_user.get("user_id")), review_note=payload.review_note, linking_service=YoungPeopleLinkingService)
    return _plan_gold_response(conn, plan_id=plan_id, result=result, message="Support plan returned")


@router.post("/plans/{plan_id}/archive")
@router.put("/plans/{plan_id}/archive")
def archive_support_plan(plan_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_review(current_user)
    _load_and_check_plan(conn, plan_id, current_user)
    result = YoungPersonPlansService.archive_support_plan(conn, plan_id=plan_id, actor_user_id=_safe_int(current_user.get("user_id")), linking_service=YoungPeopleLinkingService)
    return _plan_gold_response(conn, plan_id=plan_id, result=result, message="Support plan archived")


@router.get("/plans/{plan_id}/export")
def export_support_plan(plan_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_plan(conn, plan_id, current_user)
    return YoungPersonPlansService.export_support_plan(conn, plan_id)
