from fastapi import APIRouter, Depends
from db.connection import get_db
from auth.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/overview")
def get_overview(conn = Depends(get_db), user = Depends(get_current_user)):
    with conn.cursor() as cur:
        # Manager updates
        cur.execute("""
            SELECT message, created_at
            FROM manager_updates
            WHERE home_id = %s
            ORDER BY created_at DESC
            LIMIT 5
        """, (user["home_id"],))
        updates = cur.fetchall()

        # Staff on shift
        cur.execute("""
            SELECT full_name, role
            FROM staff_shifts
            WHERE home_id = %s AND shift_date = CURRENT_DATE
        """, (user["home_id"],))
        staff_today = cur.fetchall()

    return {
        "staff_name": user["full_name"],
        "role": user["role"],
        "home_id": user["home_id"],
        "updates": updates,
        "staff_today": staff_today
    }
