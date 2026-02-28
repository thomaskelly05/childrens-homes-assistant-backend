from fastapi import APIRouter, Depends, HTTPException
from auth.dependencies import get_current_user
from db.connection import get_db

router = APIRouter()

@router.get("/admin")
def get_admin_identity(
    user = Depends(get_current_user),
    conn = Depends(get_db)
):
    """
    Returns the authenticated admin's identity.
    This endpoint is used by the IndiCare dashboard to confirm login
    and load the correct role + username.
    """

    # Only allow admin‑level roles
    allowed_roles = ["provider_admin", "regional_manager", "system_admin"]

    if user["role"] not in allowed_roles:
        raise HTTPException(status_code=403, detail="Not authorised")

    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
                id,
                username,
                full_name,
                role
            FROM users
            WHERE id = %s
        """, (user["id"],))

        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Admin not found")

        return row
