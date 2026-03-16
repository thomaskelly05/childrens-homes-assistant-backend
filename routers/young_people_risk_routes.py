from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Risk"])


class RiskAssessmentCreate(BaseModel):
    young_person_id: int
    category: str
    title: str
    concern_summary: str | None = None
    known_triggers: str | None = None
    early_warning_signs: str | None = None
    contextual_factors: str | None = None
    current_controls: str | None = None
    deescalation_strategies: str | None = None
    response_actions: str | None = None
    child_views: str | None = None
    severity: str | None = "medium"
    likelihood: str | None = "medium"
    review_date: str | None = None
    status: str | None = "active"
    owner_id: int | None = None
    approval_status: str | None = "not_required"
    created_by: int | None = None
    archived: bool | None = False


class RiskAssessmentUpdate(BaseModel):
    category: str | None = None
    title: str | None = None
    concern_summary: str | None = None
    known_triggers: str | None = None
    early_warning_signs: str | None = None
    contextual_factors: str | None = None
    current_controls: str | None = None
    deescalation_strategies: str | None = None
    response_actions: str | None = None
    child_views: str | None = None
    severity: str | None = None
    likelihood: str | None = None
    review_date: str | None = None
    status: str | None = None
    owner_id: int | None = None
    approval_status: str | None = None
    created_by: int | None = None
    archived: bool | None = None


@router.get("/{young_person_id}/risk")
def get_young_person_risk(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Young person not found")

            cur.execute(
                """
                SELECT
                    ra.*,
                    ou.first_name AS owner_first_name,
                    ou.last_name AS owner_last_name,
                    cu.first_name AS created_by_first_name,
                    cu.last_name AS created_by_last_name
                FROM risk_assessments ra
                LEFT JOIN users ou ON ra.owner_id = ou.id
                LEFT JOIN users cu ON ra.created_by = cu.id
                WHERE ra.young_person_id = %s
                  AND COALESCE(ra.archived, FALSE) = FALSE
                  AND LOWER(COALESCE(ra.status, 'active')) NOT IN ('archived', 'completed')
                ORDER BY
                    CASE
                        WHEN LOWER(COALESCE(ra.severity, '')) = 'high' THEN 1
                        WHEN LOWER(COALESCE(ra.severity, '')) = 'medium' THEN 2
                        ELSE 3
                    END,
                    ra.review_date ASC NULLS LAST,
                    ra.created_at DESC,
                    ra.id DESC
                """,
                (young_person_id,),
            )
            return cur.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load risk assessments: {str(e)}")


@router.get("/{young_person_id}/risk/archive")
def get_young_person_archived_risk(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Young person not found")

            cur.execute(
                """
                SELECT
                    ra.*,
                    ou.first_name AS owner_first_name,
                    ou.last_name AS owner_last_name,
                    cu.first_name AS created_by_first_name,
                    cu.last_name AS created_by_last_name
                FROM risk_assessments ra
                LEFT JOIN users ou ON ra.owner_id = ou.id
                LEFT JOIN users cu ON ra.created_by = cu.id
                WHERE ra.young_person_id = %s
                  AND (
                    COALESCE(ra.archived, FALSE) = TRUE
                    OR LOWER(COALESCE(ra.status, '')) IN ('archived', 'completed')
                  )
                ORDER BY ra.updated_at DESC NULLS LAST, ra.id DESC
                """,
                (young_person_id,),
            )
            return cur.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load archived risk assessments: {str(e)}")


@router.get("/risk/{risk_id}")
def get_risk_assessment(risk_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    ra.*,
                    ou.first_name AS owner_first_name,
                    ou.last_name AS owner_last_name,
                    cu.first_name AS created_by_first_name,
                    cu.last_name AS created_by_last_name
                FROM risk_assessments ra
                LEFT JOIN users ou ON ra.owner_id = ou.id
                LEFT JOIN users cu ON ra.created_by = cu.id
                WHERE ra.id = %s
                LIMIT 1
                """,
                (risk_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Risk assessment not found")
        return row

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load risk assessment: {str(e)}")


@router.post("/risk")
def create_risk_assessment(payload: RiskAssessmentCreate, conn=Depends(get_db)):
    now = datetime.utcnow()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO risk_assessments (
                    young_person_id,
                    category,
                    title,
                    concern_summary,
                    known_triggers,
                    early_warning_signs,
                    contextual_factors,
                    current_controls,
                    deescalation_strategies,
                    response_actions,
                    child_views,
                    severity,
                    likelihood,
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
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
                """,
                (
                    payload.young_person_id,
                    payload.category,
                    payload.title,
                    payload.concern_summary,
                    payload.known_triggers,
                    payload.early_warning_signs,
                    payload.contextual_factors,
                    payload.current_controls,
                    payload.deescalation_strategies,
                    payload.response_actions,
                    payload.child_views,
                    payload.severity,
                    payload.likelihood,
                    payload.review_date,
                    payload.status,
                    payload.owner_id,
                    payload.approval_status,
                    payload.created_by,
                    payload.archived,
                    now,
                    now,
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return {"message": "Risk assessment created successfully", "id": row["id"]}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create risk assessment: {str(e)}")


@router.put("/risk/{risk_id}")
def update_risk_assessment(risk_id: int, payload: RiskAssessmentUpdate, conn=Depends(get_db)):
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = datetime.utcnow()

    set_parts = []
    values = []
    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)
    values.append(risk_id)

    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE risk_assessments
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            row = cur.fetchone()
        conn.commit()

        if not row:
            raise HTTPException(status_code=404, detail="Risk assessment not found")

        return {"message": "Risk assessment updated successfully", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update risk assessment: {str(e)}")
