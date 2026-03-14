from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Plans"])


class SupportPlanCreate(BaseModel):
    young_person_id: int
    plan_type: str
    title: str
    presenting_need: str | None = None
    summary: str | None = None
    child_voice: str | None = None
    proactive_strategies: str | None = None
    pace_guidance: str | None = None
    triggers: str | None = None
    protective_factors: str | None = None
    start_date: str
    review_date: str | None = None
    status: str = "active"
    owner_id: int | None = None
    approval_status: str = "not_required"
    created_by: int | None = None
    archived: bool = False


class SupportPlanUpdate(BaseModel):
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
    approved_by: int | None = None
    approved_at: str | None = None
    archived: bool | None = None


@router.get("/{young_person_id}/plans")
def list_support_plans(
    young_person_id: int,
    archived: bool = False,
    conn=Depends(get_db),
):
    query = """
        SELECT
            sp.*,
            u.first_name AS owner_first_name,
            u.last_name AS owner_last_name,
            cb.first_name AS created_by_first_name,
            cb.last_name AS created_by_last_name
        FROM support_plans sp
        LEFT JOIN users u ON sp.owner_id = u.id
        LEFT JOIN users cb ON sp.created_by = cb.id
        WHERE sp.young_person_id = %s
          AND COALESCE(sp.archived, FALSE) = %s
        ORDER BY sp.review_date NULLS LAST, sp.id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id, archived))
        rows = cur.fetchall()

    return rows


@router.get("/plans/{plan_id}")
def get_support_plan(
    plan_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            sp.*,
            u.first_name AS owner_first_name,
            u.last_name AS owner_last_name
        FROM support_plans sp
        LEFT JOIN users u ON sp.owner_id = u.id
        WHERE sp.id = %s
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (plan_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Support plan not found")

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT *
            FROM support_plan_targets
            WHERE support_plan_id = %s
            ORDER BY id ASC
            """,
            (plan_id,),
        )
        targets = cur.fetchall()

    row["targets"] = targets
    return row


@router.post("/plans")
def create_support_plan(
    payload: SupportPlanCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

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
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.plan_type,
        payload.title,
        payload.presenting_need,
        payload.summary,
        payload.child_voice,
        payload.proactive_strategies,
        payload.pace_guidance,
        payload.triggers,
        payload.protective_factors,
        payload.start_date,
        payload.review_date,
        payload.status,
        payload.owner_id,
        payload.approval_status,
        payload.created_by,
        payload.archived,
        now,
        now,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            new_row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create support plan: {str(e)}")

    return {"message": "Support plan created successfully", "id": new_row["id"]}


@router.put("/plans/{plan_id}")
def update_support_plan(
    plan_id: int,
    payload: SupportPlanUpdate,
    conn=Depends(get_db),
):
    if hasattr(payload, "model_dump"):
        update_data = payload.model_dump(exclude_unset=True)
    else:
        update_data = payload.dict(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = datetime.utcnow()

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
            updated_row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update support plan: {str(e)}")

    if not updated_row:
        raise HTTPException(status_code=404, detail="Support plan not found")

    return {"message": "Support plan updated successfully", "id": updated_row["id"]}


class SupportPlanTargetCreate(BaseModel):
    support_plan_id: int
    target_text: str
    target_type: str | None = None
    measure_of_success: str | None = None
    target_date: str | None = None
    progress_status: str = "not_started"
    progress_note: str | None = None


@router.post("/plan-targets")
def create_support_plan_target(
    payload: SupportPlanTargetCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO support_plan_targets (
            support_plan_id,
            target_text,
            target_type,
            measure_of_success,
            target_date,
            progress_status,
            progress_note,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.support_plan_id,
        payload.target_text,
        payload.target_type,
        payload.measure_of_success,
        payload.target_date,
        payload.progress_status,
        payload.progress_note,
        now,
        now,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            new_row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create support plan target: {str(e)}")

    return {"message": "Support plan target created successfully", "id": new_row["id"]}
