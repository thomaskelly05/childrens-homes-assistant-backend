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
    start_date: str | None = None
    review_date: str | None = None
    status: str | None = "active"
    owner_id: int | None = None
    approval_status: str | None = "not_required"
    created_by: int | None = None
    archived: bool | None = False


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
    created_by: int | None = None
    archived: bool | None = None


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
                      AND LOWER(COALESCE(sp.status, 'active')) NOT IN ('archived', 'completed')
                    ORDER BY
                        CASE
                            WHEN LOWER(COALESCE(sp.status, '')) = 'active' THEN 1
                            WHEN LOWER(COALESCE(sp.status, '')) = 'draft' THEN 2
                            ELSE 3
                        END,
                        sp.review_date ASC NULLS LAST,
                        sp.created_at DESC,
                        sp.id DESC
                    """
                ),
                (young_person_id,),
            )
            return cur.fetchall()
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
            return cur.fetchall()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load archived plans: {str(e)}")


@router.get("/plans/{plan_id}")
def get_support_plan(plan_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                fetch_plan_select_sql("WHERE sp.id = %s LIMIT 1"),
                (plan_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Support plan not found")

        return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load support plan: {str(e)}")


@router.post("/plans")
def create_support_plan(payload: SupportPlanCreate, conn=Depends(get_db)):
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
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
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
            row = cur.fetchone()
        conn.commit()
        return {"message": "Support plan created successfully", "id": row["id"]}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create support plan: {str(e)}")


@router.put("/plans/{plan_id}")
def update_support_plan(plan_id: int, payload: SupportPlanUpdate, conn=Depends(get_db)):
    update_data = payload.model_dump(exclude_unset=True)
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
            row = cur.fetchone()
        conn.commit()

        if not row:
            raise HTTPException(status_code=404, detail="Support plan not found")

        return {"message": "Support plan updated successfully", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update support plan: {str(e)}")
