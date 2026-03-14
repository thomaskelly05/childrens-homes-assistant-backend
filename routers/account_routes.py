from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor

from auth.session_user import get_current_user
from db.connection import get_db

router = APIRouter(
    prefix="/account",
    tags=["Account"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/me")
def get_account(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user["id"]

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, email, role, home_id
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        )
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
