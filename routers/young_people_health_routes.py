from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Health"])


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


def yes_no(value):
    if value is True:
        return "Yes"
    if value is False:
        return "No"
    return "—"


# =========================================================
# Models
# =========================================================

class HealthProfileUpsert(BaseModel):
    gp_name: Optional[str] = None
    allergies: Optional[str] = None
    diagnoses: Optional[str] = None


class HealthRecordCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    young_person_id: int
    record_type: str
    title: str
    summary: Optional[str] = None
    professional_name: Optional[str] = None
    outcome: Optional[str] = None
    follow_up_required: Optional[bool] = False
    next_action_date: Optional[str] = None
    event_datetime: Optional[str] = None
    created_by: Optional[int] = None


class HealthRecordUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    record_type: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    professional_name: Optional[str] = None
    outcome: Optional[str] = None
    follow_up_required: Optional[bool] = None
    next_action_date: Optional[str] = None
    event_datetime: Optional[str] = None
    created_by: Optional[int] = None


class MedicationProfileCreate(BaseModel):
    young_person_id: int
    medication_name: str
    dose: Optional[str] = None
    route: Optional[str] = None
    frequency: Optional[str] = None
    reason: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = True


class MedicationProfileUpdate(BaseModel):
    medication_name: Optional[str] = None
    dose: Optional[str] = None
    route: Optional[str] = None
    frequency: Optional[str] = None
    reason: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None


class MedicationRecordCreate(BaseModel):
    young_person_id: int
    medication_name: str
    dose: Optional[str] = None
    route: Optional[str] = None
    status: Optional[str] = None
    error_flag: Optional[bool] = False
    scheduled_time: Optional[str] = None
    administered_time: Optional[str] = None
    administered_by: Optional[int] = None


class MedicationRecordUpdate(BaseModel):
    medication_name: Optional[str] = None
    dose: Optional[str] = None
    route: Optional[str] = None
    status: Optional[str] = None
    error_flag: Optional[bool] = None
    scheduled_time: Optional[str] = None
    administered_time: Optional[str] = None
    administered_by: Optional[int] = None


# =========================================================
# Transform helpers
# =========================================================

def transform_health_record(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "young_person_id": row.get("young_person_id"),
        "record_type": row.get("record_type"),
        "title": row.get("title") or "Health record",
        "summary": row.get("summary"),
        "professional_name": row.get("professional_name"),
        "outcome": row.get("outcome"),
        "follow_up_required": row.get("follow_up_required"),
        "next_action_date": row.get("next_action_date"),
        "event_datetime": row.get("event_datetime"),
        "created_by": row.get("created_by"),
        "created_by_name": full_name(row.get("created_by_first_name"), row.get("created_by_last_name")),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),

        # shell / chronology friendly
        "event_type": "health",
        "narrative": row.get("summary") or row.get("outcome") or "Health record",
        "occurred_at": row.get("event_datetime") or row.get("created_at"),
        "workflow_status": "recorded",
        "quality_standards": ["health_and_wellbeing"],
        "judgement_areas": ["experiences_and_progress"],
    }


def transform_medication_profile(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "young_person_id": row.get("young_person_id"),
        "medication_name": row.get("medication_name"),
        "dose": row.get("dose"),
        "route": row.get("route"),
        "frequency": row.get("frequency"),
        "reason": row.get("reason"),
        "start_date": row.get("start_date"),
        "end_date": row.get("end_date"),
        "is_active": row.get("is_active"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def transform_medication_record(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "young_person_id": row.get("young_person_id"),
        "medication_name": row.get("medication_name"),
        "dose": row.get("dose"),
        "route": row.get("route"),
        "status": row.get("status"),
        "error_flag": row.get("error_flag"),
        "scheduled_time": row.get("scheduled_time"),
        "administered_time": row.get("administered_time"),
        "administered_by": row.get("administered_by"),
        "administered_by_name": full_name(row.get("administered_by_first_name"), row.get("administered_by_last_name")),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


# =========================================================
# Read routes
# =========================================================

@router.get("/{young_person_id}/health")
def get_young_person_health(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)

            cur.execute(
                """
                SELECT *
                FROM young_person_health_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            health_profile = cur.fetchone()

            cur.execute(
                """
                SELECT
                    hr.id,
                    hr.young_person_id,
                    hr.record_type,
                    hr.title,
                    hr.summary,
                    hr.professional_name,
                    hr.outcome,
                    hr.follow_up_required,
                    hr.next_action_date,
                    hr.event_datetime,
                    hr.created_by,
                    hr.created_at,
                    hr.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM health_records hr
                LEFT JOIN users u ON hr.created_by = u.id
                WHERE hr.young_person_id = %s
                ORDER BY COALESCE(hr.event_datetime, hr.created_at) DESC, hr.id DESC
                """,
                (young_person_id,),
            )
            health_records = cur.fetchall() or []

            cur.execute(
                """
                SELECT *
                FROM medication_profiles
                WHERE young_person_id = %s
                ORDER BY is_active DESC, start_date DESC NULLS LAST, id DESC
                """,
                (young_person_id,),
            )
            medication_profiles = cur.fetchall() or []

            cur.execute(
                """
                SELECT
                    mr.id,
                    mr.young_person_id,
                    mr.medication_name,
                    mr.dose,
                    mr.route,
                    mr.status,
                    mr.error_flag,
                    mr.scheduled_time,
                    mr.administered_time,
                    mr.administered_by,
                    mr.created_at,
                    mr.updated_at,
                    u.first_name AS administered_by_first_name,
                    u.last_name AS administered_by_last_name
                FROM medication_records mr
                LEFT JOIN users u ON mr.administered_by = u.id
                WHERE mr.young_person_id = %s
                ORDER BY COALESCE(mr.scheduled_time, mr.created_at) DESC, mr.id DESC
                """,
                (young_person_id,),
            )
            medication_records = cur.fetchall() or []

        return {
            "profile": health_profile or {},
            "health_profile": health_profile or {},
            "health_records": [transform_health_record(r) for r in health_records],
            "medication_profiles": [transform_medication_profile(r) for r in medication_profiles],
            "medication_records": [transform_medication_record(r) for r in medication_records],
            "items": [transform_health_record(r) for r in health_records],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load health data: {str(e)}")


@router.get("/health-records/{record_id}")
def get_health_record(record_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    hr.id,
                    hr.young_person_id,
                    hr.record_type,
                    hr.title,
                    hr.summary,
                    hr.professional_name,
                    hr.outcome,
                    hr.follow_up_required,
                    hr.next_action_date,
                    hr.event_datetime,
                    hr.created_by,
                    hr.created_at,
                    hr.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM health_records hr
                LEFT JOIN users u ON hr.created_by = u.id
                WHERE hr.id = %s
                LIMIT 1
                """,
                (record_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Health record not found")

        return transform_health_record(row)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load health record: {str(e)}")


@router.get("/medication-profiles/{profile_id}")
def get_medication_profile(profile_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM medication_profiles
                WHERE id = %s
                LIMIT 1
                """,
                (profile_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Medication profile not found")

        return transform_medication_profile(row)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load medication profile: {str(e)}")


@router.get("/medication-records/{record_id}")
def get_medication_record(record_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    mr.id,
                    mr.young_person_id,
                    mr.medication_name,
                    mr.dose,
                    mr.route,
                    mr.status,
                    mr.error_flag,
                    mr.scheduled_time,
                    mr.administered_time,
                    mr.administered_by,
                    mr.created_at,
                    mr.updated_at,
                    u.first_name AS administered_by_first_name,
                    u.last_name AS administered_by_last_name
                FROM medication_records mr
                LEFT JOIN users u ON mr.administered_by = u.id
                WHERE mr.id = %s
                LIMIT 1
                """,
                (record_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Medication record not found")

        return transform_medication_record(row)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load medication record: {str(e)}")


# =========================================================
# Profile upsert
# =========================================================

@router.put("/{young_person_id}/health/profile")
def upsert_health_profile(
    young_person_id: int,
    payload: HealthProfileUpsert,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)

            cur.execute(
                """
                SELECT id
                FROM young_person_health_profile
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
                    UPDATE young_person_health_profile
                    SET
                        gp_name = %s,
                        allergies = %s,
                        diagnoses = %s
                    WHERE id = %s
                    RETURNING *
                    """,
                    (
                        payload.gp_name,
                        payload.allergies,
                        payload.diagnoses,
                        existing["id"],
                    ),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO young_person_health_profile (
                        young_person_id,
                        gp_name,
                        allergies,
                        diagnoses
                    )
                    VALUES (%s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        young_person_id,
                        payload.gp_name,
                        payload.allergies,
                        payload.diagnoses,
                    ),
                )

            row = cur.fetchone()

        conn.commit()
        return row

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update health profile: {str(e)}")


# =========================================================
# Health records create/update
# =========================================================

@router.post("/health-records")
def create_health_record(payload: HealthRecordCreate, conn=Depends(get_db)):
    now = now_utc()

    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, payload.young_person_id)

            cur.execute(
                """
                INSERT INTO health_records (
                    young_person_id,
                    record_type,
                    title,
                    summary,
                    professional_name,
                    outcome,
                    follow_up_required,
                    next_action_date,
                    event_datetime,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    payload.young_person_id,
                    payload.record_type,
                    payload.title,
                    payload.summary,
                    payload.professional_name,
                    payload.outcome,
                    payload.follow_up_required,
                    payload.next_action_date,
                    payload.event_datetime,
                    payload.created_by,
                    now,
                    now,
                ),
            )
            row = cur.fetchone()

        conn.commit()
        return {"message": "Health record created successfully", "id": row["id"]}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create health record: {str(e)}")


@router.put("/health-records/{record_id}")
def update_health_record(record_id: int, payload: HealthRecordUpdate, conn=Depends(get_db)):
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = now_utc()

    set_parts = []
    values = []

    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)

    values.append(record_id)

    query = f"""
        UPDATE health_records
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
            raise HTTPException(status_code=404, detail="Health record not found")

        conn.commit()
        return {"message": "Health record updated successfully", "id": row["id"]}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update health record: {str(e)}")


# =========================================================
# Medication profiles create/update
# =========================================================

@router.post("/medication-profiles")
def create_medication_profile(payload: MedicationProfileCreate, conn=Depends(get_db)):
    now = now_utc()

    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, payload.young_person_id)

            cur.execute(
                """
                INSERT INTO medication_profiles (
                    young_person_id,
                    medication_name,
                    dose,
                    route,
                    frequency,
                    reason,
                    start_date,
                    end_date,
                    is_active,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    payload.young_person_id,
                    payload.medication_name,
                    payload.dose,
                    payload.route,
                    payload.frequency,
                    payload.reason,
                    payload.start_date,
                    payload.end_date,
                    payload.is_active,
                    now,
                    now,
                ),
            )
            row = cur.fetchone()

        conn.commit()
        return {"message": "Medication profile created successfully", "id": row["id"]}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create medication profile: {str(e)}")


@router.put("/medication-profiles/{profile_id}")
def update_medication_profile(profile_id: int, payload: MedicationProfileUpdate, conn=Depends(get_db)):
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = now_utc()

    set_parts = []
    values = []

    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)

    values.append(profile_id)

    query = f"""
        UPDATE medication_profiles
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
            raise HTTPException(status_code=404, detail="Medication profile not found")

        conn.commit()
        return {"message": "Medication profile updated successfully", "id": row["id"]}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update medication profile: {str(e)}")


# =========================================================
# Medication records create/update
# =========================================================

@router.post("/medication-records")
def create_medication_record(payload: MedicationRecordCreate, conn=Depends(get_db)):
    now = now_utc()

    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, payload.young_person_id)

            cur.execute(
                """
                INSERT INTO medication_records (
                    young_person_id,
                    medication_name,
                    dose,
                    route,
                    status,
                    error_flag,
                    scheduled_time,
                    administered_time,
                    administered_by,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    payload.young_person_id,
                    payload.medication_name,
                    payload.dose,
                    payload.route,
                    payload.status,
                    payload.error_flag,
                    payload.scheduled_time,
                    payload.administered_time,
                    payload.administered_by,
                    now,
                    now,
                ),
            )
            row = cur.fetchone()

        conn.commit()
        return {"message": "Medication record created successfully", "id": row["id"]}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create medication record: {str(e)}")


@router.put("/medication-records/{record_id}")
def update_medication_record(record_id: int, payload: MedicationRecordUpdate, conn=Depends(get_db)):
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = now_utc()

    set_parts = []
    values = []

    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)

    values.append(record_id)

    query = f"""
        UPDATE medication_records
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
            raise HTTPException(status_code=404, detail="Medication record not found")

        conn.commit()
        return {"message": "Medication record updated successfully", "id": row["id"]}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update medication record: {str(e)}")
