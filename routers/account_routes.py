from fastapi import APIRouter, Depends, HTTPException, Request
from db.connection import get_db
import jwt
from auth.tokens import JWT_SECRET, JWT_ALGORITHM

router = APIRouter(prefix="/account", tags=["Account"])

def get_user_from_cookie(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload["sub"], "role": payload["role"]}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/me")
def get_me(
    request: Request,
    conn = Depends(get_db),
    user = Depends(get_user_from_cookie)
):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, name, email, role, home_id
            FROM users
            WHERE id = %s
        """, (user["id"],))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    return row
