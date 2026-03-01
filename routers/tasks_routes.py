from fastapi import APIRouter, Depends, HTTPException, Request
from db.connection import get_db
import jwt
from auth.tokens import JWT_SECRET, JWT_ALGORITHM

router = APIRouter(prefix="/tasks", tags=["Tasks"])

def get_user_from_cookie(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload["sub"], "role": payload["role"]}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/today")
def get_today_tasks(
    request: Request,
    conn = Depends(get_db),
    user = Depends(get_user_from_cookie)
):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, task, completed
            FROM tasks
            WHERE staff_id = %s
            ORDER BY id ASC
        """, (user["id"],))
        rows = cur.fetchall()

    return rows


@router.post("/complete/{task_id}")
def complete_task(
    task_id: int,
    request: Request,
    conn = Depends(get_db),
    user = Depends(get_user_from_cookie)
):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE tasks
            SET completed = TRUE
            WHERE id = %s AND staff_id = %s
        """, (task_id, user["id"]))
        conn.commit()

    return {"status": "ok"}
