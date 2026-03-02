from fastapi import APIRouter, Depends, HTTPException, Request
from db.connection import get_db
import jwt
from auth.tokens import JWT_SECRET, JWT_ALGORITHM

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

def get_user_from_cookie(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload["sub"], "role": payload["role"]}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/summary")
def get_dashboard_summary(
    request: Request,
    conn = Depends(get_db),
    user = Depends(get_user_from_cookie)
):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT
                (SELECT COUNT(*) FROM tasks WHERE staff_id = %s AND completed = FALSE) AS pending_tasks,
            (SELECT COUNT(*) FROM staff_journal WHERE staff_id = %s) AS journal_entries,
            (SELECT COUNT(*) FROM handover WHERE home_id = %s) AS handovers
        """, (user["id"], user["id"], user["id"]))
        row = cur.fetchone()

    return row
