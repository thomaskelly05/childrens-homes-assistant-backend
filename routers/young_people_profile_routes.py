from fastapi import APIRouter, Depends, HTTPException

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Profile"])


@router.get("/{young_person_id}/profile")
def get_young_person_profile(
    young_person_id: int,
    conn=Depends(get_db),
):
    with conn.cursor() as cur:
        # Confirm young person exists
        cur.execute(
            """
            SELECT id, first_name, last_name, preferred_name
            FROM young_people
            WHERE id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        young_person = cur.fetchone()

        if not young_person:
            raise HTTPException(status_code=404, detail="Young person not found")

        # Legal status
        cur.execute(
            """
            SELECT *
            FROM young_person_legal_status
            WHERE young_person_id = %s
            ORDER BY is_current DESC, effective_from DESC, id DESC
            """,
            (young_person_id,),
        )
        legal_statuses = cur.fetchall()

        # Contacts
        cur.execute(
            """
            SELECT *
            FROM young_person_contacts
            WHERE young_person_id = %s
            ORDER BY id ASC
            """,
            (young_person_id,),
        )
        contacts = cur.fetchall()

        # Education profile
        cur.execute(
            """
            SELECT *
            FROM young_person_education_profile
            WHERE young_person_id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        education_profile = cur.fetchone()

        # Health profile
        cur.execute(
            """
            SELECT *
            FROM young_person_health_profile
            WHERE young_person_id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        health_profile = cur.fetchone()

        # Communication profile
        cur.execute(
            """
            SELECT *
            FROM young_person_communication_profile
            WHERE young_person_id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        communication_profile = cur.fetchone()

        # Identity profile
        cur.execute(
            """
            SELECT *
            FROM young_person_identity_profile
            WHERE young_person_id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        identity_profile = cur.fetchone()

        # Alerts
        cur.execute(
            """
            SELECT *
            FROM young_person_alerts
            WHERE young_person_id = %s
            AND is_active = TRUE
            ORDER BY severity DESC, id DESC
            """,
            (young_person_id,),
        )
        alerts = cur.fetchall()

    return {
        "young_person": young_person,
        "legal_statuses": legal_statuses,
        "contacts": contacts,
        "education_profile": education_profile,
        "health_profile": health_profile,
        "communication_profile": communication_profile,
        "identity_profile": identity_profile,
        "alerts": alerts,
    }
