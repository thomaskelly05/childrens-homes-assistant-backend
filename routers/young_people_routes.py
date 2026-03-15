from fastapi import APIRouter, Depends, HTTPException
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People"])


@router.get("")
def list_young_people(conn=Depends(get_db)):
    query = """
        SELECT
            yp.id,
            yp.first_name,
            yp.last_name,
            yp.date_of_birth,
            yp.status,
            yp.preferred_name,
            yp.gender,
            yp.ethnicity,
            yp.legal_status,
            yp.summary,
            yp.about_me,
            h.name AS placement_name
        FROM young_people yp
        LEFT JOIN homes h ON yp.home_id = h.id
        WHERE COALESCE(yp.is_active, TRUE) = TRUE
        ORDER BY yp.last_name ASC, yp.first_name ASC
    """

    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

    return rows


@router.get("/{young_person_id}")
def get_young_person(young_person_id: int, conn=Depends(get_db)):
    query = """
        SELECT
            yp.id,
            yp.first_name,
            yp.last_name,
            yp.date_of_birth,
            yp.status,
            yp.preferred_name,
            yp.gender,
            yp.ethnicity,
            yp.legal_status,
            yp.summary,
            yp.about_me,
            h.name AS placement_name
        FROM young_people yp
        LEFT JOIN homes h ON yp.home_id = h.id
        WHERE yp.id = %s
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Young person not found")

    return row
