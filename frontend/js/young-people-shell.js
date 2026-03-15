from fastapi import APIRouter, Depends, HTTPException

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People"])


@router.get("")
def list_young_people(conn=Depends(get_db)):
    query = """
        SELECT
            id,
            first_name,
            last_name,
            preferred_name,
            dob,
            room,
            placement_status,
            placement_type,
            legal_status,
            local_authority,
            social_worker
        FROM young_people
        ORDER BY first_name ASC, last_name ASC, id ASC
    """

    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

    return rows


@router.get("/list")
def list_young_people_alias(conn=Depends(get_db)):
    query = """
        SELECT
            id,
            first_name,
            last_name,
            preferred_name,
            dob,
            room,
            placement_status,
            placement_type,
            legal_status,
            local_authority,
            social_worker
        FROM young_people
        ORDER BY first_name ASC, last_name ASC, id ASC
    """

    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

    return rows


@router.get("/{young_person_id}")
def get_young_person_overview(young_person_id: int, conn=Depends(get_db)):
    query = """
        SELECT *
        FROM young_people
        WHERE id = %s
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Young person not found")

    return row
