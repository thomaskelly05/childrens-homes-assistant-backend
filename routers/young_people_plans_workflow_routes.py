from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people/plans", tags=["Young People Plans Workflow"])


class ReturnPlanPayload(BaseModel):
    review_note: Optional[str] = None


def now_utc():
    return datetime.utcnow()


def fetch_plan(cur, plan_id: int):
    cur.execute(
        """
        SELECT
            id,
            young_person_id,
            plan_type,
            title,
            summary,
            child_voice,
            presenting_need,
            proactive_strategies,
            pace_guidance,
            triggers,
            protective_factors,
            start_date,
            review_date,
            status,
            approval_status,
            owner_id,
            created_by,
            archived,
            created_at,
            updated_at
        FROM support_plans
        WHERE id = %s
        LIMIT 1
        """,
        (plan_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    return row


def transform_plan(row: dict) -> dict:
    approval_status = (row.get("approval_status") or "").strip().lower()
    base_status = (row.get("status") or "").strip().lower()

    display_status = approval_status or base_status or "draft"
    if display_status == "not_required":
        display_status = base_status or "draft"

    return {
        "id": row.get("id"),
        "young_person_id": row.get("young_person_id"),
        "plan_type": row.get("plan_type") or "support_plan",
        "title": row.get("title"),
        "summary": row.get("summary"),
        "child_voice": row.get("child_voice"),
        "formulation": row.get("presenting_need"),
        "staff_guidance": row.get("proactive_strategies"),
        "pace_guidance": row.get("pace_guidance"),
        "triggers": row.get("triggers"),
        "protective_factors": row.get("protective_factors"),
        "start_date": row.get("start_date"),
        "review_due_at": row.get("review_date"),
        "status": display_status,
        "record_status": base_status,
        "approval_status": approval_status,
        "owner_id": row.get("owner_id"),
        "created_by": row.get("created_by"),
        "archived": row.get("archived"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
        "version_no": 1,
    }


@router.post("/{plan_id}/submit")
def submit_plan(plan_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            fetch_plan(cur, plan_id)

            cur.execute(
                """
                UPDATE support_plans
                SET
                    approval_status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING
                    id,
                    young_person_id,
                    plan_type,
                    title,
                    summary,
                    child_voice,
                    presenting_need,
                    proactive_strategies,
                    pace_guidance,
                    triggers,
                    protective_factors,
                    start_date,
                    review_date,
                    status,
                    approval_status,
                    owner_id,
                    created_by,
                    archived,
                    created_at,
                    updated_at
                """,
                ("submitted", now_utc(), plan_id),
            )
            row = cur.fetchone()

        conn.commit()
        return transform_plan(row)
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit plan: {str(e)}")


@router.post("/{plan_id}/approve")
def approve_plan(plan_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            fetch_plan(cur, plan_id)

            cur.execute(
                """
                UPDATE support_plans
                SET
                    approval_status = %s,
                    status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING
                    id,
                    young_person_id,
                    plan_type,
                    title,
                    summary,
                    child_voice,
                    presenting_need,
                    proactive_strategies,
                    pace_guidance,
                    triggers,
                    protective_factors,
                    start_date,
                    review_date,
                    status,
                    approval_status,
                    owner_id,
                    created_by,
                    archived,
                    created_at,
                    updated_at
                """,
                ("approved", "active", now_utc(), plan_id),
            )
            row = cur.fetchone()

        conn.commit()
        return transform_plan(row)
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve plan: {str(e)}")


@router.post("/{plan_id}/return")
def return_plan(plan_id: int, payload: ReturnPlanPayload, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            fetch_plan(cur, plan_id)

            cur.execute(
                """
                UPDATE support_plans
                SET
                    approval_status = %s,
                    status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING
                    id,
                    young_person_id,
                    plan_type,
                    title,
                    summary,
                    child_voice,
                    presenting_need,
                    proactive_strategies,
                    pace_guidance,
                    triggers,
                    protective_factors,
                    start_date,
                    review_date,
                    status,
                    approval_status,
                    owner_id,
                    created_by,
                    archived,
                    created_at,
                    updated_at
                """,
                ("returned", "draft", now_utc(), plan_id),
            )
            row = cur.fetchone()

        conn.commit()
        result = transform_plan(row)
        result["review_note"] = payload.review_note or ""
        return result
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to return plan: {str(e)}")


@router.post("/{plan_id}/archive")
def archive_plan(plan_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            fetch_plan(cur, plan_id)

            cur.execute(
                """
                UPDATE support_plans
                SET
                    archived = TRUE,
                    status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING
                    id,
                    young_person_id,
                    plan_type,
                    title,
                    summary,
                    child_voice,
                    presenting_need,
                    proactive_strategies,
                    pace_guidance,
                    triggers,
                    protective_factors,
                    start_date,
                    review_date,
                    status,
                    approval_status,
                    owner_id,
                    created_by,
                    archived,
                    created_at,
                    updated_at
                """,
                ("archived", now_utc(), plan_id),
            )
            row = cur.fetchone()

        conn.commit()
        return transform_plan(row)
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to archive plan: {str(e)}")
