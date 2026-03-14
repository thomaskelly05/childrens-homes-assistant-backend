from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Health"])


class HealthRecordCreate(BaseModel):
    young_person_id: int
    record_type: str
    event_datetime: str
    title: str
    summary: str | None = None
    professional_name: str | None = None
    outcome: str | None = None
    follow_up_required: bool = False
    next_action_date: str | None = None
    created_by: int | None = None


class HealthRecordUpdate(BaseModel):
    record_type: str | None = None
    event_datetime: str | None = None
    title: str | None = None
    summary: str | None = None
    professional_name: str | None = None
    outcome: str | None = None
    follow_up_required: bool | None = None
    next_action_date: str | None = None
    created_by: int | None = None


class MedicationProfileCreate(BaseModel):
    young_person_id: int
    medication_name: str
    dosage: str
    route: str | None = None
    frequency: str | None = None
    prn_guidance: str | None = None
    prescribed_by: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_active: bool = True
    notes: str | None = None


class MedicationRecordCreate(BaseModel):
    young_person_id: int
    medication_profile_id: int | None = None
    scheduled_time: str
    administered_time: str | None = None
    medication_name: str
    dose: str | None = None
    route: str | None = None
    status: str
    refusal_reason: str | None = None
    omission_reason: str | None = None
    error_flag: bool = False
    error_details: str | None = None
    manager_review_status: str = "not_required"
    administered_by: int | None = None


@router.get("/{young_person_id}/health")
def list_health_records(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            hr.*,
            u.first_name AS created_by_first_name,
            u.last_name AS created_by_last_name
        FROM health_records hr
        LEFT JOIN users u ON hr.created_by = u.id
        WHERE hr.young_person_id = %s
        ORDER BY hr.event_datetime DESC, hr.id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        rows = cur.fetchall()

    return rows


@router.get("/{young_person_id}/medication-profiles")
def list_medication_profiles(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT *
        FROM medication_profiles
        WHERE young_person_id = %s
        ORDER BY is_active DESC, medication_name ASC, id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        rows = cur.fetchall()

    return rows


@router.get("/{young_person_id}/medication-records")
def list_medication_records(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            mr.*,
            u.first_name AS administered_by_first_name,
            u.last_name AS administered_by_last_name
        FROM medication_records mr
        LEFT JOIN users u ON mr.administered_by = u.id
        WHERE mr.young_person_id = %s
        ORDER BY mr.scheduled_time DESC, mr.id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        rows = cur.fetchall()

    return rows


@router.post("/health-records")
def create_health_record(
    payload: HealthRecordCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO health_records (
            young_person_id,
            record_type,
            event_datetime,
            title,
            summary,
            professional_name,
            outcome,
            follow_up_required,
            next_action_date,
            created_by,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.record_type,
        payload.event_datetime,
        payload.title,
        payload.summary,
        payload.professional_name,
        payload.outcome,
        payload.follow_up_required,
        payload.next_action_date,
        payload.created_by,
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
        raise HTTPException(status_code=500, detail=f"Failed to create health record: {str(e)}")

    return {"message": "Health record created successfully", "id": new_row["id"]}


@router.put("/health-records/{health_record_id}")
def update_health_record(
    health_record_id: int,
    payload: HealthRecordUpdate,
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

    values.append(health_record_id)

    query = f"""
        UPDATE health_records
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
        raise HTTPException(status_code=500, detail=f"Failed to update health record: {str(e)}")

    if not updated_row:
        raise HTTPException(status_code=404, detail="Health record not found")

    return {"message": "Health record updated successfully", "id": updated_row["id"]}


@router.post("/medication-profiles")
def create_medication_profile(
    payload: MedicationProfileCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO medication_profiles (
            young_person_id,
            medication_name,
            dosage,
            route,
            frequency,
            prn_guidance,
            prescribed_by,
            start_date,
            end_date,
            is_active,
            notes,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.medication_name,
        payload.dosage,
        payload.route,
        payload.frequency,
        payload.prn_guidance,
        payload.prescribed_by,
        payload.start_date,
        payload.end_date,
        payload.is_active,
        payload.notes,
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
        raise HTTPException(status_code=500, detail=f"Failed to create medication profile: {str(e)}")

    return {"message": "Medication profile created successfully", "id": new_row["id"]}


@router.post("/medication-records")
def create_medication_record(
    payload: MedicationRecordCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO medication_records (
            young_person_id,
            medication_profile_id,
            scheduled_time,
            administered_time,
            medication_name,
            dose,
            route,
            status,
            refusal_reason,
            omission_reason,
            error_flag,
            error_details,
            manager_review_status,
            administered_by,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.medication_profile_id,
        payload.scheduled_time,
        payload.administered_time,
        payload.medication_name,
        payload.dose,
        payload.route,
        payload.status,
        payload.refusal_reason,
        payload.omission_reason,
        payload.error_flag,
        payload.error_details,
        payload.manager_review_status,
        payload.administered_by,
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
        raise HTTPException(status_code=500, detail=f"Failed to create medication record: {str(e)}")

    return {"message": "Medication record created successfully", "id": new_row["id"]}
