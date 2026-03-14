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
    severity: str
    likelihood: str
    review_date: str | None = None
    status: str = "active"
    owner_id: int | None = None
    approval_status: str = "not_required"
    created_by: int | None = None
    archived: bool = False


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
    approved_by: int | None = None
    approved_at: str | None = None
    archived: bool | None = None


class RiskReviewCreate(BaseModel):
    risk_assessment_id: int
    review_date: str
    review_note: str | None = None
    reviewed_by: int | None = None
    outcome_status: str | None = None
    next_review_date: str | None = None


@router.get("/{young_person_id}/risks")
def list_risk_assessments(
    young_person_id: int,
    archived: bool = False,
    conn=Depends(get_db),
):
    query = """
        SELECT
            ra.*,
            u.first_name AS owner_first_name,
            u.last_name AS owner_last_name,
            cb.first_name AS created_by_first_name,
            cb.last_name AS created_by_last_name
        FROM risk_assessments ra
        LEFT JOIN users u ON ra.owner_id = u.id
        LEFT JOIN users cb ON ra.created_by = cb.id
        WHERE ra.young_person_id = %s
          AND COALESCE(ra.archived, FALSE) = %s
        ORDER BY ra.review_date NULLS LAST, ra.id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id, archived))
        rows = cur.fetchall()

    return rows


@router.get("/risks/{risk_id}")
def get_risk_assessment(
    risk_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            ra.*,
            u.first_name AS owner_first_name,
            u.last_name AS owner_last_name
        FROM risk_assessments ra
        LEFT JOIN users u ON ra.owner_id = u.id
        WHERE ra.id = %s
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (risk_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Risk assessment not found")

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT *
            FROM risk_reviews
            WHERE risk_assessment_id = %s
            ORDER BY review_date DESC, id DESC
            """,
            (risk_id,),
        )
        reviews = cur.fetchall()

    row["reviews"] = reviews
    return row


@router.post("/risks")
def create_risk_assessment(
    payload: RiskAssessmentCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
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
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
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
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            new_row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create risk assessment: {str(e)}")

    return {"message": "Risk assessment created successfully", "id": new_row["id"]}


@router.put("/risks/{risk_id}")
def update_risk_assessment(
    risk_id: int,
    payload: RiskAssessmentUpdate,
    conn=Depends(get_db),
):
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

    query = f"""
        UPDATE risk_assessments
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
        raise HTTPException(status_code=500, detail=f"Failed to update risk assessment: {str(e)}")

    if not updated_row:
        raise HTTPException(status_code=404, detail="Risk assessment not found")

    return {"message": "Risk assessment updated successfully", "id": updated_row["id"]}


@router.post("/risk-reviews")
def create_risk_review(
    payload: RiskReviewCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO risk_reviews (
            risk_assessment_id,
            review_date,
            review_note,
            reviewed_by,
            outcome_status,
            next_review_date,
            created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.risk_assessment_id,
        payload.review_date,
        payload.review_note,
        payload.reviewed_by,
        payload.outcome_status,
        payload.next_review_date,
        now,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            new_row = cur.fetchone()

        if payload.next_review_date:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE risk_assessments
                    SET review_date = %s,
                        updated_at = %s
                    WHERE id = %s
                    """,
                    (payload.next_review_date, now, payload.risk_assessment_id),
                )

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create risk review: {str(e)}")

    return {"message": "Risk review created successfully", "id": new_row["id"]}
