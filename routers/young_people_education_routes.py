from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Education"])


# =========================================================
# Helpers
# =========================================================

def now_utc():
    return datetime.utcnow()


def ensure_young_person_exists(cur, young_person_id: int):
    cur.execute("SELECT id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Young person not found")


def full_name(first_name, last_name):
    return " ".join([x for x in [first_name, last_name] if x]).strip() or None


def transform_education_record(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "young_person_id": row.get("young_person_id"),
        "record_date": row.get("record_date"),
        "occurred_at": row.get("record_date") or row.get("created_at"),
        "attendance_status": row.get("attendance_status"),
        "provision_name": row.get("provision_name"),
        "behaviour_summary": row.get("behaviour_summary"),
        "learning_engagement": row.get("learning_engagement"),
        "issue_raised": row.get("issue_raised"),
        "action_taken": row.get("action_taken"),
        "professional_involved": row.get("professional_involved"),
        "achievement_note": row.get("achievement_note"),
        "created_by": row.get("created_by"),
        "created_by_name": full_name(row.get("created_by_first_name"), row.get("created_by_last_name")),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),

        # shell fields
        "title": row.get("provision_name") or "Education record",
        "summary": row.get("achievement_note") or row.get("behaviour_summary") or "Education update",
        "narrative": row.get("achievement_note") or row.get("behaviour_summary") or "Education update",
        "event_type": "education",
        "workflow_status": "recorded",
        "quality_standards": ["education"],
        "judgement_areas": ["experiences_and_progress"],
    }


# =========================================================
# Models
# =========================================================

class EducationProfileUpsert(BaseModel):
    school_name: Optional[str] = None
    year_group: Optional[str] = None
    education_status: Optional[str] = None


class EducationRecordCreate(BaseModel):
    young_person_id: int
    record_date: Optional[str] = None
    attendance_status: Optional[str] = None
    provision_name: Optional[str] = None
    behaviour_summary: Optional[str] = None
    learning_engagement: Optional[str] = None
    issue_raised: Optional[str] = None
    action_taken: Optional[str] = None
    professional_involved: Optional[str] = None
    achievement_note: Optional[str] = None
    created_by: Optional[int] = None


class EducationRecordUpdate(BaseModel):
    record_date: Optional[str] = None
    attendance_status: Optional[str] = None
    provision_name: Optional[str] = None
    behaviour_summary: Optional[str] = None
    learning_engagement: Optional[str] = None
    issue_raised: Optional[str] = None
    action_taken: Optional[str] = None
    professional_involved: Optional[str] = None
    achievement_note: Optional[str] = None
    created_by: Optional[int] = None


# =========================================================
# Read routes
# =========================================================

@router.get("/{young_person_id}/education")
def get_young_person_education(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)

            cur.execute(
                """
                SELECT *
                FROM young_person_education_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            education_profile = cur.fetchone()

            cur.execute(
                """
                SELECT
                    er.id,
                    er.young_person_id,
                    er.record_date,
                    er.attendance_status,
                    er.provision_name,
                    er.behaviour_summary,
                    er.learning_engagement,
                    er.issue_raised,
                    er.action_taken,
                    er.professional_involved,
                    er.achievement_note,
                    er.created_by,
                    er.created_at,
                    er.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM education_records er
                LEFT JOIN users u ON er.created_by = u.id
                WHERE er.young_person_id = %s
                ORDER BY er.record_date DESC NULLS LAST, er.created_at DESC
                """,
                (young_person_id,),
            )
            records = cur.fetchall() or []

        return {
            "profile": education_profile or {},
            "education_profile": education_profile or {},
            "education_records": [transform_education_record(r) for r in records],
            "items": [transform_education_record(r) for r in records],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load education data: {str(e)}")


@router.get("/education-records/{record_id}")
def get_education_record(record_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    er.*,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM education_records er
                LEFT JOIN users u ON er.created_by = u.id
                WHERE er.id = %s
                LIMIT 1
                """,
                (record_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Education record not found")

        return transform_education_record(row)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load education record: {str(e)}")


# =========================================================
# Profile
# =========================================================

@router.put("/{young_person_id}/education/profile")
def upsert_education_profile(
    young_person_id: int,
    payload: EducationProfileUpsert,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)

            cur.execute(
                """
                SELECT id
                FROM young_person_education_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            existing = cur.fetchone()

            if existing:
                cur.execute(
                    """
                    UPDATE young_person_education_profile
                    SET
                        school_name = %s,
                        year_group = %s,
                        education_status = %s
                    WHERE id = %s
                    RETURNING *
                    """,
                    (
                        payload.school_name,
                        payload.year_group,
                        payload.education_status,
                        existing["id"],
                    ),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO young_person_education_profile (
                        young_person_id,
                        school_name,
                        year_group,
                        education_status
                    )
                    VALUES (%s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        young_person_id,
                        payload.school_name,
                        payload.year_group,
                        payload.education_status,
                    ),
                )

            row = cur.fetchone()

        conn.commit()
        return row

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update education profile: {str(e)}")


# =========================================================
# Records create/update
# =========================================================

@router.post("/education-records")
def create_education_record(payload: EducationRecordCreate, conn=Depends(get_db)):
    now = now_utc()

    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, payload.young_person_id)

            cur.execute(
                """
                INSERT INTO education_records (
                    young_person_id,
                    record_date,
                    attendance_status,
                    provision_name,
                    behaviour_summary,
                    learning_engagement,
                    issue_raised,
                    action_taken,
                    professional_involved,
                    achievement_note,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id
                """,
                (
                    payload.young_person_id,
                    payload.record_date,
                    payload.attendance_status,
                    payload.provision_name,
                    payload.behaviour_summary,
                    payload.learning_engagement,
                    payload.issue_raised,
                    payload.action_taken,
                    payload.professional_involved,
                    payload.achievement_note,
                    payload.created_by,
                    now,
                    now,
                ),
            )
            row = cur.fetchone()

        conn.commit()
        return {"id": row["id"]}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create education record: {str(e)}")


@router.put("/education-records/{record_id}")
def update_education_record(record_id: int, payload: EducationRecordUpdate, conn=Depends(get_db)):
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided")

    update_data["updated_at"] = now_utc()

    set_parts = []
    values = []

    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)

    values.append(record_id)

    query = f"""
        UPDATE education_records
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
            raise HTTPException(status_code=404, detail="Record not found")

        conn.commit()
        return {"id": row["id"]}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update education record: {str(e)}")
