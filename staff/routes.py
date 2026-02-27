from fastapi import APIRouter, Depends
from auth.dependencies import require_role
from db.connection import get_db

router = APIRouter()

@router.get("/staff")
def list_staff(user = Depends(require_role(["provider_admin", "regional_manager"])), conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("SELECT id, email, home_id FROM users WHERE role='staff'")
        return cur.fetchall()
