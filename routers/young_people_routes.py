from fastapi import APIRouter, Depends
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People"])


@router.get("")
def list_young_people(conn=Depends(get_db)):
    query = """
        SELECT
            id,
            first_name,
            last_name,
            dob,
            room,
            placement_status
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
    return row
