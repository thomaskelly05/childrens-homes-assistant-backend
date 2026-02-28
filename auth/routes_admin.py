from fastapi import APIRouter, Depends, HTTPException, Request
from db.connection import get_db
from auth.dependencies import verify_jwt

router = APIRouter()

@router.get("/admin")
def get_admin_identity(request: Request, conn = Depends(get_db)):
    payload = verify_jwt(request)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
                id,
                email,
                full_name,
                role,
                home_id,
                archived,
                created_at,
                updated_at
            FROM users
            WHERE id = %s
        """, (user_id,))
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "home_id": user["home_id"],
            "archived": user["archived"],
            "created_at": user["created_at"],
            "updated_at": user["updated_at"]
        }
