from fastapi import APIRouter, Depends
from db.connection import get_db
from auth.dependencies import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("/today")
def get_tasks(conn = Depends(get_db), user = Depends(get_current_user)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, task, completed
            FROM tasks
            WHERE home_id = %s AND task_date = CURRENT_DATE
        """, (user["home_id"],))
        return cur.fetchall()

@router.post("/complete/{task_id}")
def complete_task(task_id: int, conn = Depends(get_db), user = Depends(get_current_user)):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE tasks SET completed = TRUE
            WHERE id = %s AND home_id = %s
        """, (task_id, user["home_id"]))
        conn.commit()
    return {"status": "completed"}
