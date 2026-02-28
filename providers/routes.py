from fastapi import APIRouter, Depends
from auth.dependencies import require_role
from db.connection import get_db

router = APIRouter()

@router.get("/providers")
def list_providers(
    user = Depends(require_role(["provider_admin", "regional_manager"])),
    conn = Depends(get_db)
):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
                id,
                name,
                region
            FROM providers
            ORDER BY name
        """)
        return cur.fetchall()
