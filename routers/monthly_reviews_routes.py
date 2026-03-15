from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/monthly-reviews", tags=["Monthly Reviews"])


class MonthlyReviewCreate(BaseModel):
    young_person_id: int
    review_month: str
    review_title: str | None = None
    summary_of_month: str | None = None
    progress_summary: str | None = None
    child_voice_summary: str | None = None
    concerns_and_risks: str | None = None
    education_summary: str | None = None
    health_summary: str | None = None
    family_summary: str | None = None
    keywork_summary: str | None = None
    behaviour_summary: str | None = None
    achievements_summary: str | None = None
    actions_for_next_month: str | None = None
    manager_analysis: str | None = None
    created_by: int | None = None


class MonthlyReviewUpdate(BaseModel):
    status: str | None = None
    review_title: str | None = None
    summary_of_month: str | None = None
    progress_summary: str | None = None
    child_voice_summary: str | None = None
    concerns_and_risks: str | None = None
    education_summary: str | None = None
    health_summary: str | None = None
    family_summary: str | None = None
    keywork_summary: str | None = None
    behaviour_summary: str | None = None
    achievements_summary: str | None = None
    actions_for_next_month: str | None = None
    manager_analysis: str | None = None
    approved_by: int | None = None
    approved_at: str | None = None


@router.get("/young-person/{young_person_id}")
def list_monthly_reviews(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT *
        FROM monthly_reviews
        WHERE young_person_id = %s
        ORDER BY review_month DESC, id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        rows = cur.fetchall()

    return rows


@router.get("/{monthly_review_id}")
def get_monthly_review(
    monthly_review_id: int,
    conn=Depends(get_db),
):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT *
            FROM monthly_reviews
            WHERE id = %s
            LIMIT 1
            """,
            (monthly_review_id,),
        )
        review = cur.fetchone()

        if not review:
            raise HTTPException(status_code=404, detail="Monthly review not found")

        cur.execute(
            """
            SELECT *
            FROM monthly_review_record_links
            WHERE monthly_review_id = %s
            ORDER BY id ASC
            """,
            (monthly_review_id,),
        )
        links = cur.fetchall()

        cur.execute(
            """
            SELECT *
            FROM monthly_review_standard_summaries
            WHERE monthly_review_id = %s
            ORDER BY standard_code ASC
            """,
            (monthly_review_id,),
        )
        standards = cur.fetchall()

        cur.execute(
            """
            SELECT *
            FROM monthly_review_actions
            WHERE monthly_review_id = %s
            ORDER BY due_date ASC NULLS LAST, id ASC
            """,
            (monthly_review_id,),
        )
        actions = cur.fetchall()

    return {
        "review": review,
        "record_links": links,
        "standards": standards,
        "actions": actions,
    }


@router.post("")
def create_monthly_review(
    payload: MonthlyReviewCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO monthly_reviews (
            young_person_id,
            review_month,
            status,
            review_title,
            summary_of_month,
            progress_summary,
            child_voice_summary,
            concerns_and_risks,
            education_summary,
            health_summary,
            family_summary,
            keywork_summary,
            behaviour_summary,
            achievements_summary,
            actions_for_next_month,
            manager_analysis,
            created_by,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.review_month,
        "draft",
        payload.review_title,
        payload.summary_of_month,
        payload.progress_summary,
        payload.child_voice_summary,
        payload.concerns_and_risks,
        payload.education_summary,
        payload.health_summary,
        payload.family_summary,
        payload.keywork_summary,
        payload.behaviour_summary,
        payload.achievements_summary,
        payload.actions_for_next_month,
        payload.manager_analysis,
        payload.created_by,
        now,
        now,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create monthly review: {str(e)}")

    return {"message": "Monthly review created successfully", "id": row["id"]}


@router.put("/{monthly_review_id}")
def update_monthly_review(
    monthly_review_id: int,
    payload: MonthlyReviewUpdate,
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

    values.append(monthly_review_id)

    query = f"""
        UPDATE monthly_reviews
        SET {", ".join(set_parts)}
        WHERE id = %s
        RETURNING id
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update monthly review: {str(e)}")

    if not row:
        raise HTTPException(status_code=404, detail="Monthly review not found")

    return {"message": "Monthly review updated successfully", "id": row["id"]}
