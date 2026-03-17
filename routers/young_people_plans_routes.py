from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field, ConfigDict

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Plans"])


# =========================================================
# Helpers
# =========================================================

def now_utc():
    return datetime.utcnow()


def normalise_status(value: Optional[str]) -> str:
    v = (value or "").strip().lower()

    if v in {"draft", "active", "completed", "archived"}:
        return v

    if v in {"approved"}:
        return "active"

    if v in {"returned"}:
        return "draft"

    return "draft"


def normalise_approval_status(value: Optional[str]) -> str:
    v = (value or "").strip().lower()

    if v in {"not_required", "draft", "submitted", "approved", "returned"}:
        return v

    return "draft"


def full_name(first_name, last_name):
    return " ".join([x for x in [first_name, last_name] if x]).strip() or None


def ensure_young_person_exists(cur, young_person_id: int):
    cur.execute("SELECT id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Young person not found")


def fetch_plan_select_sql(where_sql: str):
    return f"""
        SELECT
            sp.id,
            sp.young_person_id,
            sp.plan_type,
            sp.title,
            sp.presenting_need,
            sp.summary,
            sp.child_voice,
            sp.proactive_strategies,
            sp.pace_guidance,
            sp.triggers,
            sp.protective_factors,
            sp.start_date,
            sp.review_date,
            sp.status,
            sp.owner_id,
            sp.approval_status,
            sp.created_by,
            sp.archived,
            sp.created_at,
            sp.updated_at,
            ou.first_name AS owner_first_name,
            ou.last_name AS owner_last_name,
            cu.first_name AS created_by_first_name,
            cu.last_name AS created_by_last_name
        FROM support_plans sp
        LEFT JOIN users ou ON sp.owner_id = ou.id
        LEFT JOIN users cu ON sp.created_by = cu.id
        {where_sql}
    """


def transform_plan_row(row: dict) -> dict:
    """
    Maps the existing support_plans table shape into the richer
    children’s-home document shape expected by the new shell.
    """
    owner_name = full_name(row.get("owner_first_name"), row.get("owner_last_name"))
    created_by_name = full_name(row.get("created_by_first_name"), row.get("created_by_last_name"))

    approval_status = normalise_approval_status(row.get("approval_status"))
    base_status = normalise_status(row.get("status"))

    # Front-end display status
    display_status = approval_status
    if approval_status in {"not_required", "draft"}:
        display_status = base_status if base_status in {"draft", "active", "archived", "completed"} else "draft"

    return {
        "id": row.get("id"),
        "young_person_id": row.get("young_person_id"),
        "plan_type": row.get("plan_type") or "support_plan",
        "title": row.get("title"),
        "presenting_need": row.get("presenting_need"),
        "summary": row.get("summary"),
        "child_voice": row.get("child_voice"),
        "proactive_strategies": row.get("proactive_strategies"),
        "pace_guidance": row.get("pace_guidance"),
        "triggers": row.get("triggers"),
        "protective_factors": row.get("protective_factors"),
        "start_date": row.get("start_date"),
        "review_date": row.get("review_date"),
        "review_due_at": row.get("review_date"),
        "status": display_status,
        "record_status": base_status,
        "approval_status": approval_status,
        "owner_id": row.get("owner_id"),
        "owner_name": owner_name,
        "reviewer_name": None,
        "created_by": row.get("created_by"),
        "created_by_name": created_by_name,
        "archived": row.get("archived"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),

        # Aliases for the richer front-end/editor
        "staff_guidance": row.get("proactive_strategies"),
        "formulation": row.get("presenting_need"),
        "version_no": 1,
    }


def fetch_plan_by_id(cur, plan_id: int):
    cur.execute(
        fetch_plan_select_sql("WHERE sp.id = %s LIMIT 1"),
        (plan_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Support plan not found")
    return row


# =========================================================
# Request models
# =========================================================

class SupportPlanCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    young_person_id: int
    plan_type: str = "support_plan"
    title: str

    presenting_need: Optional[str] = None
    summary: Optional[str] = None
    child_voice: Optional[str] = None
    proactive_strategies: Optional[str] = None
    pace_guidance: Optional[str] = None
    triggers: Optional[str] = None
    protective_factors: Optional[str] = None
    start_date: Optional[str] = None
    review_date: Optional[str] = None

    status: Optional[str] = "draft"
    owner_id: Optional[int] = None
    approval_status: Optional[str] = "draft"
    created_by: Optional[int] = None
    archived: Optional[bool] = False

    # Front-end aliases
    staff_guidance: Optional[str] = Field(default=None, alias="staff_guidance")
    formulation: Optional[str] = Field(default=None, alias="formulation")


class SupportPlanUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    plan_type: Optional[str] = None
    title: Optional[str] = None
    presenting_need: Optional[str] = None
    summary: Optional[str] = None
    child_voice: Optional[str] = None
    proactive_strategies: Optional[str] = None
    pace_guidance: Optional[str] = None
    triggers: Optional[str] = None
    protective_factors: Optional[str] = None
    start_date: Optional[str] = None
    review_date: Optional[str] = None
    status: Optional[str] = None
    owner_id: Optional[int] = None
    approval_status: Optional[str] = None
    created_by: Optional[int] = None
    archived: Optional[bool] = None

    # Front-end aliases
    staff_guidance: Optional[str] = Field(default=None, alias="staff_guidance")
    formulation: Optional[str] = Field(default=None, alias="formulation")


class ReviewDecisionPayload(BaseModel):
    review_note: Optional[str] = None


# =========================================================
# Read routes
# =========================================================

@router.get("/{young_person_id}/plans")
def get_young_person_plans(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)
            cur.execute(
                fetch_plan_select_sql(
                    """
                    WHERE sp.young_person_id = %s
                      AND COALESCE(sp.archived, FALSE) = FALSE
                      AND LOWER(COALESCE(sp.status, 'draft')) NOT IN ('archived', 'completed')
                    ORDER BY
                        CASE
                            WHEN LOWER(COALESCE(sp.approval_status, '')) = 'returned' THEN 1
                            WHEN LOWER(COALESCE(sp.approval_status, '')) = 'submitted' THEN 2
                            WHEN LOWER(COALESCE(sp.status, '')) = 'draft' THEN 3
                            WHEN LOWER(COALESCE(sp.status, '')) = 'active' THEN 4
                            ELSE 5
                        END,
                        sp.review_date ASC NULLS LAST,
                        sp.updated_at DESC,
                        sp.id DESC
                    """
                ),
                (young_person_id,),
            )
            rows = cur.fetchall() or []
            return {"items": [transform_plan_row(r) for r in rows]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load plans: {str(e)}")


@router.get("/{young_person_id}/plans/archive")
def get_young_person_archived_plans(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)
            cur.execute(
                fetch_plan_select_sql(
                    """
                    WHERE sp.young_person_id = %s
                      AND (
                        COALESCE(sp.archived, FALSE) = TRUE
                        OR LOWER(COALESCE(sp.status, '')) IN ('archived', 'completed')
                      )
                    ORDER BY sp.updated_at DESC, sp.id DESC
                    """
                ),
                (young_person_id,),
            )
            rows = cur.fetchall() or []
            return {"items": [transform_plan_row(r) for r in rows]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load archived plans: {str(e)}")


@router.get("/plans/{plan_id}")
def get_support_plan(plan_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            row = fetch_plan_by_id(cur, plan_id)
            return transform_plan_row(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load support plan: {str(e)}")


# =========================================================
# Create / update routes
# =========================================================

@router.post("/plans")
def create_support_plan(payload: SupportPlanCreate, conn=Depends(get_db)):
    now = now_utc()

    presenting_need = payload.presenting_need
    proactive_strategies = payload.proactive_strategies

    # Support richer front-end aliases
    if payload.formulation is not None:
        presenting_need = payload.formulation

    if payload.staff_guidance is not None:
        proactive_strategies = payload.staff_guidance

    query = """
        INSERT INTO support_plans (
            young_person_id,
            plan_type,
            title,
            presenting_need,
            summary,
            child_voice,
            proactive_strategies,
            pace_guidance,
            triggers,
            protective_factors,
            start_date,
            review_date,
            status,
            owner_id,
            approval_status,
            created_by,
            archived,
            created_at,
            updated_at
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.plan_type or "support_plan",
        payload.title,
        presenting_need,
        payload.summary,
        payload.child_voice,
        proactive_strategies,
        payload.pace_guidance,
        payload.triggers,
        payload.protective_factors,
        payload.start_date,
        payload.review_date,
        normalise_status(payload.status),
        payload.owner_id,
        normalise_approval_status(payload.approval_status),
        payload.created_by,
        bool(payload.archived),
        now,
        now,
    )

    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, payload.young_person_id)
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()
        return {"message": "Support plan created successfully", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create support plan: {str(e)}")


@router.put("/plans/{plan_id}")
def update_support_plan(plan_id: int, payload: SupportPlanUpdate, conn=Depends(get_db)):
    update_data = payload.model_dump(exclude_unset=True, by_alias=False)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    # Map richer UI aliases back onto your existing table columns
    if "staff_guidance" in update_data:
        update_data["proactive_strategies"] = update_data.pop("staff_guidance")

    if "formulation" in update_data:
        update_data["presenting_need"] = update_data.pop("formulation")

    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = normalise_status(update_data["status"])

    if "approval_status" in update_data and update_data["approval_status"] is not None:
        update_data["approval_status"] = normalise_approval_status(update_data["approval_status"])

    update_data["updated_at"] = now_utc()

    set_parts = []
    values = []
    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)
    values.append(plan_id)

    query = f"""
        UPDATE support_plans
        SET {", ".join(set_parts)}
        WHERE id = %s
        RETURNING id
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Support plan not found")

        conn.commit()
        return {"message": "Support plan updated successfully", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update support plan: {str(e)}")


# =========================================================
# Workflow routes
# =========================================================

@router.post("/plans/{plan_id}/submit")
def submit_support_plan(plan_id: int, conn=Depends(get_db)):
    """
    Sends a plan into manager review.
    """
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE support_plans
                SET
                    approval_status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("submitted", now_utc(), plan_id),
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Support plan not found")

        conn.commit()
        return {"ok": True, "status": "submitted", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit support plan: {str(e)}")


@router.post("/plans/{plan_id}/approve")
def approve_support_plan(plan_id: int, conn=Depends(get_db)):
    """
    Approves a plan and makes it active.
    """
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE support_plans
                SET
                    approval_status = %s,
                    status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("approved", "active", now_utc(), plan_id),
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Support plan not found")

        conn.commit()
        return {"ok": True, "status": "approved", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve support plan: {str(e)}")


@router.post("/plans/{plan_id}/return")
def return_support_plan(plan_id: int, payload: ReviewDecisionPayload, conn=Depends(get_db)):
    """
    Returns a plan for amendment.
    For now this uses approval_status only.
    """
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE support_plans
                SET
                    approval_status = %s,
                    status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("returned", "draft", now_utc(), plan_id),
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Support plan not found")

        conn.commit()
        return {
            "ok": True,
            "status": "returned",
            "id": row["id"],
            "review_note": payload.review_note or "",
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to return support plan: {str(e)}")


@router.post("/plans/{plan_id}/archive")
def archive_support_plan(plan_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE support_plans
                SET
                    archived = TRUE,
                    status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("archived", now_utc(), plan_id),
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Support plan not found")

        conn.commit()
        return {"ok": True, "status": "archived", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to archive support plan: {str(e)}")


# =========================================================
# Export route
# =========================================================

@router.get("/plans/{plan_id}/export")
def export_support_plan(plan_id: int, conn=Depends(get_db)):
    """
    Simple export endpoint so the new front end has something usable immediately.
    This returns a professional plain-text export in a new tab.
    """
    try:
        with conn.cursor() as cur:
            row = fetch_plan_by_id(cur, plan_id)
            plan = transform_plan_row(row)

        text = f"""INDICARE SUPPORT PLAN EXPORT

Title: {plan.get('title') or '—'}
Plan type: {plan.get('plan_type') or '—'}
Young person ID: {plan.get('young_person_id') or '—'}

Status: {plan.get('status') or '—'}
Record status: {plan.get('record_status') or '—'}
Approval status: {plan.get('approval_status') or '—'}
Version: {plan.get('version_no') or 1}

Owner: {plan.get('owner_name') or '—'}
Created by: {plan.get('created_by_name') or '—'}
Start date: {plan.get('start_date') or '—'}
Review date: {plan.get('review_due_at') or '—'}

SUMMARY
{plan.get('summary') or '—'}

CHILD VIEWS, WISHES AND FEELINGS
{plan.get('child_voice') or '—'}

FORMULATION / PRESENTING NEED
{plan.get('formulation') or '—'}

STAFF GUIDANCE / PROACTIVE STRATEGIES
{plan.get('staff_guidance') or '—'}

PACE GUIDANCE
{plan.get('pace_guidance') or '—'}

TRIGGERS
{plan.get('triggers') or '—'}

PROTECTIVE FACTORS
{plan.get('protective_factors') or '—'}

Created at: {plan.get('created_at') or '—'}
Updated at: {plan.get('updated_at') or '—'}
"""

        return PlainTextResponse(
            content=text,
            headers={
                "Content-Disposition": f'inline; filename="support-plan-{plan_id}.txt"'
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export support plan: {str(e)}")
