from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from db.connection import get_db
import jwt
from auth.tokens import JWT_SECRET, JWT_ALGORITHM

router = APIRouter(prefix="/staff/journal", tags=["Staff Journal"])

class JournalEntry(BaseModel):
    holding_today: str | None = None
    practice_today: str | None = None
    reflection_today: str | None = None


def get_user_from_cookie(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload["sub"], "role": payload["role"]}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("", response_model=JournalEntry)
def get_journal(
    request: Request,
    conn = Depends(get_db),
    user = Depends(get_user_from_cookie)
):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT holding_today, practice_today, reflection_today
            FROM staff_journal
            WHERE staff_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (user["id"],))
        row = cur.fetchone()

    if not row:
        return JournalEntry()

    return JournalEntry(**row)


@router.post("", response_model=JournalEntry)
def save_journal(
    payload: JournalEntry,
    request: Request,
    conn = Depends(get_db),
    user = Depends(get_user_from_cookie)
):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO staff_journal (staff_id, holding_today, practice_today, reflection_today)
            VALUES (%s, %s, %s, %s)
        """, (
            user["id"],
            payload.holding_today,
            payload.practice_today,
            payload.reflection_today
        ))
        conn.commit()

    return payload
