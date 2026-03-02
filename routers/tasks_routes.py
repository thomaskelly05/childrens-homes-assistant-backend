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


def get_user_home_id(conn, user_id: int):
    with conn.cursor() as cur:
        cur.execute("SELECT home_id FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
    if not row or not row["home_id"]:
        raise HTTPException(status_code=400, detail="User has no assigned home")
    return row["home_id"]


@router.get("/today")
def get_today_tasks(
    request: Request,
    conn = Depends(get_db),
    user = Depends(get_user_from_cookie)
):
    home_id = get_user_home_id(conn, user["id"])
    role = user["role"]

    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, task, completed, task_date, created_at, assigned_role
            FROM tasks
            WHERE home_id = %s
            AND (assigned_role = %s OR assigned_role = 'staff')
            ORDER BY id ASC
        """, (home_id, role))
        rows = cur.fetchall()

    return rows


@router.post("/complete/{task_id}")
def complete_task(
    task_id: int,
    request: Request,
    conn = Depends(get_db),
    user = Depends(get_user_from_cookie)
):
    home_id = get_user_home_id(conn, user["id"])

    with conn.cursor() as cur:
        cur.execute("""
            UPDATE tasks
            SET completed = TRUE
            WHERE id = %s AND home_id = %s
        """, (task_id, home_id))
        conn.commit()

    return {"status": "ok"}


@router.post("/create")
def create_task(
    data: dict,
    request: Request,
    conn = Depends(get_db),
    user = Depends(get_user_from_cookie)
):
    # Only elevated roles can create tasks
    if user["role"] not in ["manager", "deputy", "senior", "provider_admin"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    task = data.get("task")
    assigned_role = data.get("assigned_role", "staff")
    task_date = data.get("task_date")

    if not task:
        raise HTTPException(status_code=400, detail="Task text required")

    home_id = get_user_home_id(conn, user["id"])

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO tasks (home_id, task, assigned_role, task_date)
            VALUES (%s, %s, %s, %s)
        """, (home_id, task, assigned_role, task_date))
        conn.commit()

    return {"status": "ok"}
