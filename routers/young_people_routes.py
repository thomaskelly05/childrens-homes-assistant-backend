from fastapi import APIRouter, Depends, HTTPException
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People"])


# =========================================================
# LIST YOUNG PEOPLE
# =========================================================
@router.get("/")
def list_young_people(conn=Depends(get_db)):
    query = """
        SELECT
            yp.id,
            yp.home_id,
            yp.first_name,
            yp.last_name,
            yp.placement_status,
            yp.summary_risk_level,
            u.first_name AS primary_keyworker_first_name,
            u.last_name AS primary_keyworker_last_name
        FROM young_people yp
        LEFT JOIN users u
            ON yp.primary_keyworker_id = u.id
        WHERE COALESCE(yp.archived, FALSE) = FALSE
        ORDER BY yp.first_name ASC, yp.last_name ASC
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall() or []

        return {"items": rows}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# OPTIONAL ALIAS
@router.get("/list")
def list_young_people_alias(conn=Depends(get_db)):
    return list_young_people(conn)


# =========================================================
# SINGLE OVERVIEW
# =========================================================
@router.get("/{young_person_id}")
def get_young_person(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM young_people
                WHERE id = %s
                LIMIT 1
                """,
                (young_person_id,)
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Not found")

        return row

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
