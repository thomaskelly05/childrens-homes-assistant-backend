from fastapi import APIRouter, Depends, HTTPException, Request
from db.connection import get_db
import jwt
from auth.tokens import JWT_SECRET, JWT_ALGORITHM

router = APIRouter(prefix="/handover", tags=["Handover"])

def get_user_from_cookie(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload["sub"], "role": payload["role"]}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/incoming")
def get_incoming_handover(
    request: Request,
    conn = Depends(get_db),
    user = Depends(get_user_from_cookie)
):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT environment, incidents, staff_wellbeing, operational_notes, created_at
            FROM handover
            WHERE home_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (user["id"],))
        row = cur.fetchone()

    if not row:
        return {
            "environment": None,
            "incidents": None,
            "staff_wellbeing": None,
            "operational_notes": None,
            "created_at": None
        }

    return row
