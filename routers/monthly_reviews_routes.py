from calendar import monthrange
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
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


class MonthlyReviewActionCreate(BaseModel):
    monthly_review_id: int
    action_text: str
    action_owner_id: int | None = None
    due_date: str | None = None
    status: str = "open"


class MonthlyReviewActionUpdate(BaseModel):
    action_text: str | None = None
    action_owner_id: int | None = None
    due_date: str | None = None
    status: str | None = None


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
            SELECT
                mrs.*,
                qs.title AS standard_title,
                qs.short_label AS standard_short_label,
                qs.display_order
            FROM monthly_review_standard_summaries mrs
            JOIN quality_standards qs
              ON mrs.standard_code = qs.code
            WHERE mrs.monthly_review_id = %s
            ORDER BY qs.display_order ASC
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


@router.post("/actions")
def create_monthly_review_action(
    payload: MonthlyReviewActionCreate,
    conn=Depends(get_db),
):
    query = """
        INSERT INTO monthly_review_actions (
            monthly_review_id,
            action_text,
            action_owner_id,
            due_date,
            status,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
        RETURNING id
    """

    values = (
        payload.monthly_review_id,
        payload.action_text,
        payload.action_owner_id,
        payload.due_date,
        payload.status,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create monthly review action: {str(e)}")

    return {"message": "Monthly review action created successfully", "id": row["id"]}


@router.put("/actions/{action_id}")
def update_monthly_review_action(
    action_id: int,
    payload: MonthlyReviewActionUpdate,
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

    values.append(action_id)

    query = f"""
        UPDATE monthly_review_actions
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
        raise HTTPException(status_code=500, detail=f"Failed to update monthly review action: {str(e)}")

    if not row:
        raise HTTPException(status_code=404, detail="Monthly review action not found")

    return {"message": "Monthly review action updated successfully", "id": row["id"]}


@router.post("/young-person/{young_person_id}/generate")
def generate_monthly_review(
    young_person_id: int,
    review_month: str = Query(..., description="Month start in YYYY-MM-DD format"),
    conn=Depends(get_db),
):
    try:
        month_start = date.fromisoformat(review_month)
    except ValueError:
        raise HTTPException(status_code=400, detail="review_month must be YYYY-MM-DD")

    last_day = monthrange(month_start.year, month_start.month)[1]
    month_end = date(month_start.year, month_start.month, last_day)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM monthly_reviews
                WHERE young_person_id = %s
                  AND review_month = %s
                LIMIT 1
                """,
                (young_person_id, month_start),
            )
            existing = cur.fetchone()

            if existing:
                review_id = existing["id"]
            else:
                cur.execute(
                    """
                    INSERT INTO monthly_reviews (
                        young_person_id,
                        review_month,
                        status,
                        review_title,
                        created_at,
                        updated_at
                    )
                    VALUES (%s, %s, %s, %s, NOW(), NOW())
                    RETURNING id
                    """,
                    (
                        young_person_id,
                        month_start,
                        "draft",
                        f"Monthly Review - {month_start.strftime('%B %Y')}",
                    ),
                )
                review_id = cur.fetchone()["id"]

            cur.execute(
                "DELETE FROM monthly_review_record_links WHERE monthly_review_id = %s",
                (review_id,),
            )

            # Daily notes
            cur.execute(
                """
                INSERT INTO monthly_review_record_links (monthly_review_id, source_table, source_id, link_reason)
                SELECT %s, 'daily_notes', id, 'Included in monthly review evidence'
                FROM daily_notes
                WHERE young_person_id = %s
                  AND note_date >= %s
                  AND note_date <= %s
                """,
                (review_id, young_person_id, month_start, month_end),
            )

            # Incidents
            cur.execute(
                """
                INSERT INTO monthly_review_record_links (monthly_review_id, source_table, source_id, link_reason)
                SELECT %s, 'incidents', id, 'Incident within review period'
                FROM incidents
                WHERE young_person_id = %s
                  AND DATE(COALESCE(incident_datetime, created_at)) >= %s
                  AND DATE(COALESCE(incident_datetime, created_at)) <= %s
                """,
                (review_id, young_person_id, month_start, month_end),
            )

            # Education
            cur.execute(
                """
                INSERT INTO monthly_review_record_links (monthly_review_id, source_table, source_id, link_reason)
                SELECT %s, 'education_records', id, 'Education evidence for review month'
                FROM education_records
                WHERE young_person_id = %s
                  AND record_date >= %s
                  AND record_date <= %s
                """,
                (review_id, young_person_id, month_start, month_end),
            )

            # Health
            cur.execute(
                """
                INSERT INTO monthly_review_record_links (monthly_review_id, source_table, source_id, link_reason)
                SELECT %s, 'health_records', id, 'Health evidence for review month'
                FROM health_records
                WHERE young_person_id = %s
                  AND DATE(event_datetime) >= %s
                  AND DATE(event_datetime) <= %s
                """,
                (review_id, young_person_id, month_start, month_end),
            )

            # Family
            cur.execute(
                """
                INSERT INTO monthly_review_record_links (monthly_review_id, source_table, source_id, link_reason)
                SELECT %s, 'family_contact_records', id, 'Family contact evidence for review month'
                FROM family_contact_records
                WHERE young_person_id = %s
                  AND DATE(contact_datetime) >= %s
                  AND DATE(contact_datetime) <= %s
                """,
                (review_id, young_person_id, month_start, month_end),
            )

            # Keywork
            cur.execute(
                """
                INSERT INTO monthly_review_record_links (monthly_review_id, source_table, source_id, link_reason)
                SELECT %s, 'keywork_sessions', id, 'Key work evidence for review month'
                FROM keywork_sessions
                WHERE young_person_id = %s
                  AND session_date >= %s
                  AND session_date <= %s
                """,
                (review_id, young_person_id, month_start, month_end),
            )

            # Plans active in period
            cur.execute(
                """
                INSERT INTO monthly_review_record_links (monthly_review_id, source_table, source_id, link_reason)
                SELECT %s, 'support_plans', id, 'Active plan linked to monthly review'
                FROM support_plans
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                """,
                (review_id, young_person_id),
            )

            # Risk active in period
            cur.execute(
                """
                INSERT INTO monthly_review_record_links (monthly_review_id, source_table, source_id, link_reason)
                SELECT %s, 'risk_assessments', id, 'Active risk linked to monthly review'
                FROM risk_assessments
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                """,
                (review_id, young_person_id),
            )

            cur.execute(
                "DELETE FROM monthly_review_standard_summaries WHERE monthly_review_id = %s",
                (review_id,),
            )

            cur.execute(
                """
                INSERT INTO monthly_review_standard_summaries (
                    monthly_review_id,
                    standard_code,
                    evidence_count,
                    narrative_summary,
                    created_at,
                    updated_at
                )
                SELECT
                    %s,
                    qs.code,
                    COUNT(rsl.id) AS evidence_count,
                    NULL,
                    NOW(),
                    NOW()
                FROM quality_standards qs
                LEFT JOIN record_standard_links rsl
                    ON rsl.standard_code = qs.code
                   AND rsl.young_person_id = %s
                GROUP BY qs.code, qs.display_order
                ORDER BY qs.display_order
                """,
                (review_id, young_person_id),
            )

            # Lightweight generated text placeholders from available source data
            cur.execute(
                """
                UPDATE monthly_reviews
                SET
                    summary_of_month = COALESCE(summary_of_month, 'Monthly evidence has been gathered and linked for review.'),
                    progress_summary = COALESCE(progress_summary, 'Review linked records to assess progress across care, education, health, relationships and behaviour.'),
                    child_voice_summary = COALESCE(child_voice_summary, 'Use linked daily notes, key work and family contact records to summarise the child''s views and wishes.'),
                    concerns_and_risks = COALESCE(concerns_and_risks, 'Review incidents, risks and emerging themes from the month.'),
                    updated_at = NOW()
                WHERE id = %s
                """,
                (review_id,),
            )

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate monthly review: {str(e)}")

    return {"message": "Monthly review evidence generated", "monthly_review_id": review_id}
