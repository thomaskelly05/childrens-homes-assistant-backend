from fastapi import APIRouter, Depends
from auth.dependencies import require_role
from db.connection import get_db

router = APIRouter()

@router.get("/homes")
def list_homes(user = Depends(require_role(["provider_admin", "regional_manager"])), conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM homes")
        return cur.fetchall()
