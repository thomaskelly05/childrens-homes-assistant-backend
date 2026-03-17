from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Family"])


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


def transform_contact(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "young_person_id": row.get("young_person_id"),
        "full_name": row.get("full_name"),
        "relationship_to_child": row.get("relationship_to_child"),
        "phone_number": row.get("phone_number"),
        "email": row.get("email"),
        "address": row.get("address"),
        "is_parental_responsibility_holder": row.get("is_parental_responsibility_holder"),
        "is_approved_contact": row.get("is_approved_contact"),
        "contact_notes": row.get("contact_notes"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def transform_family_contact_record(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "young_person_id": row.get("young_person_id"),
        "contact_datetime": row.get("contact_datetime"),
        "occurred_at": row.get("contact_datetime") or row.get("created_at"),
        "contact_type": row.get("contact_type"),
        "contact_person": row.get("contact_person"),
        "supervision_level": row.get("supervision_level"),
        "location": row.get("location"),
        "pre_contact_presentation": row.get("pre_contact_presentation"),
        "post_contact_presentation": row.get("post_contact_presentation"),
        "child_voice": row.get("child_voice"),
        "concerns": row.get("concerns"),
        "follow_up_required": row.get("follow_up_required"),
        "created_by": row.get("created_by"),
        "created_by_name": full_name(row.get("created_by_first_name"), row.get("created_by_last_name")),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),

        # shell / chronology friendly
        "title": row.get("contact_person") or "Family contact",
        "summary": row.get("child_voice") or row.get("post_contact_presentation") or row.get("concerns") or "Family contact recorded",
        "narrative": row.get("child_voice") or row.get("post_contact_presentation") or row.get("concerns") or "Family contact recorded",
        "event_type": "family",
        "workflow_status": "recorded",
        "quality_standards": ["positive_relationships", "wishes_and_feelings"],
        "judgement_areas": ["experiences_and_progress"],
    }


# =========================================================
# Models
# =========================================================

class FamilyContactCreate(BaseModel):
    full_name: str
    relationship_to_child: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_parental_responsibility_holder: Optional[bool] = False
    is_approved_contact: Optional[bool] = False
    contact_notes: Optional[str] = None


class FamilyContactUpdate(BaseModel):
    full_name: Optional[str] = None
    relationship_to_child: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_parental_responsibility_holder: Optional[bool] = None
    is_approved_contact: Optional[bool] = None
    contact_notes: Optional[str] = None


class FamilyContactRecordCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    young_person_id: int
    contact_datetime: Optional[str] = None
    contact_type: Optional[str] = None
    contact_person: str
    supervision_level: Optional[str] = None
    location: Optional[str] = None
    pre_contact_presentation: Optional[str] = None
    post_contact_presentation: Optional[str] = None
    child_voice: Optional[str] = None
    concerns: Optional[str] = None
    follow_up_required: Optional[bool] = False
    created_by: Optional[int] = None


class FamilyContactRecordUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    contact_datetime: Optional[str] = None
    contact_type: Optional[str] = None
    contact_person: Optional[str] = None
    supervision_level: Optional[str] = None
    location: Optional[str] = None
    pre_contact_presentation: Optional[str] = None
    post_contact_presentation: Optional[str] = None
    child_voice: Optional[str] = None
    concerns: Optional[str] = None
    follow_up_required: Optional[bool] = None
    created_by: Optional[int] = None


# =========================================================
# Read routes
# =========================================================

@router.get("/{young_person_id}/family")
def get_young_person_family(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)

            cur.execute(
                """
                SELECT *
                FROM young_person_contacts
                WHERE young_person_id = %s
                ORDER BY
                    COALESCE(is_parental_responsibility_holder, FALSE) DESC,
                    COALESCE(is_approved_contact, FALSE) DESC,
                    full_name ASC,
                    id DESC
                """,
                (young_person_id,),
            )
            contacts = cur.fetchall() or []

            cur.execute(
                """
                SELECT
                    fcr.id,
                    fcr.young_person_id,
                    fcr.contact_datetime,
                    fcr.contact_type,
                    fcr.contact_person,
                    fcr.supervision_level,
                    fcr.location,
                    fcr.pre_contact_presentation,
                    fcr.post_contact_presentation,
                    fcr.child_voice,
                    fcr.concerns,
                    fcr.follow_up_required,
                    fcr.created_by,
                    fcr.created_at,
                    fcr.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM family_contact_records fcr
                LEFT JOIN users u ON fcr.created_by = u.id
                WHERE fcr.young_person_id = %s
                ORDER BY COALESCE(fcr.contact_datetime, fcr.created_at) DESC, fcr.id DESC
                """,
                (young_person_id,),
            )
            family_contact_records = cur.fetchall() or []

        return {
            "contacts": [transform_contact(r) for r in contacts],
            "family_contact_records": [transform_family_contact_record(r) for r in family_contact_records],
            "items": [transform_family_contact_record(r) for r in family_contact_records],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load family data: {str(e)}")


@router.get("/family/contacts/{contact_id}")
def get_family_contact(contact_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM young_person_contacts
                WHERE id = %s
                LIMIT 1
                """,
                (contact_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Contact not found")

        return transform_contact(row)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load contact: {str(e)}")


@router.get("/family/records/{record_id}")
def get_family_contact_record(record_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    fcr.id,
                    fcr.young_person_id,
                    fcr.contact_datetime,
                    fcr.contact_type,
                    fcr.contact_person,
                    fcr.supervision_level,
                    fcr.location,
                    fcr.pre_contact_presentation,
                    fcr.post_contact_presentation,
                    fcr.child_voice,
                    fcr.concerns,
                    fcr.follow_up_required,
                    fcr.created_by,
                    fcr.created_at,
                    fcr.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM family_contact_records fcr
                LEFT JOIN users u ON fcr.created_by = u.id
                WHERE fcr.id = %s
                LIMIT 1
                """,
                (record_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Family contact record not found")

        return transform_family_contact_record(row)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load family contact record: {str(e)}")


# =========================================================
# Contact create / update
# =========================================================

@router.post("/{young_person_id}/family/contacts")
def create_family_contact(
    young_person_id: int,
    payload: FamilyContactCreate,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)

            cur.execute(
                """
                INSERT INTO young_person_contacts (
                    young_person_id,
                    full_name,
                    relationship_to_child,
                    phone_number,
                    email,
                    address,
                    is_parental_responsibility_holder,
                    is_approved_contact,
                    contact_notes
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    young_person_id,
                    payload.full_name,
                    payload.relationship_to_child,
                    payload.phone_number,
                    payload.email,
                    payload.address,
                    payload.is_parental_responsibility_holder,
                    payload.is_approved_contact,
                    payload.contact_notes,
                ),
            )
            row = cur.fetchone()

        conn.commit()
        return transform_contact(row)

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create contact: {str(e)}")


@router.put("/family/contacts/{contact_id}")
def update_family_contact(
    contact_id: int,
    payload: FamilyContactUpdate,
    conn=Depends(get_db),
):
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    set_parts = []
    values = []

    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)

    values.append(contact_id)

    query = f"""
        UPDATE young_person_contacts
        SET {", ".join(set_parts)}
        WHERE id = %s
        RETURNING *
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Contact not found")

        conn.commit()
        return transform_contact(row)

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update contact: {str(e)}")


# =========================================================
# Family contact record create / update
# =========================================================

@router.post("/family/records")
def create_family_contact_record(payload: FamilyContactRecordCreate, conn=Depends(get_db)):
    now = now_utc()

    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, payload.young_person_id)

            cur.execute(
                """
                INSERT INTO family_contact_records (
                    young_person_id,
                    contact_datetime,
                    contact_type,
                    contact_person,
                    supervision_level,
                    location,
                    pre_contact_presentation,
                    post_contact_presentation,
                    child_voice,
                    concerns,
                    follow_up_required,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    payload.young_person_id,
                    payload.contact_datetime,
                    payload.contact_type,
                    payload.contact_person,
                    payload.supervision_level,
                    payload.location,
                    payload.pre_contact_presentation,
                    payload.post_contact_presentation,
                    payload.child_voice,
                    payload.concerns,
                    payload.follow_up_required,
                    payload.created_by,
                    now,
                    now,
                ),
            )
            row = cur.fetchone()

        conn.commit()
        return {"message": "Family contact record created successfully", "id": row["id"]}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create family contact record: {str(e)}")


@router.put("/family/records/{record_id}")
def update_family_contact_record(record_id: int, payload: FamilyContactRecordUpdate, conn=Depends(get_db)):
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
        UPDATE family_contact_records
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
            raise HTTPException(status_code=404, detail="Family contact record not found")

        conn.commit()
        return {"message": "Family contact record updated successfully", "id": row["id"]}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update family contact record: {str(e)}")
