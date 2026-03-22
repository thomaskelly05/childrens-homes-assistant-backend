from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, EmailStr
from psycopg2.extras import RealDictCursor
import bcrypt

from db.connection import get_db
from auth.tokens import decode_session_token

router = APIRouter(prefix="/admin", tags=["Admin"])


class CreateUserRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: str
    home_id: int
    is_active: bool = True


class UpdateUserRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    role: str | None = None
    home_id: int | None = None
    is_active: bool | None = None
    archived: bool | None = None


class ResetPasswordRequest(BaseModel):
    password: str


def get_current_admin(authorization: str | None = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = parts[1].strip()
    payload = decode_session_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return payload


@router.get("/users")
def list_users(
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                first_name,
                last_name,
                email,
                role,
                home_id,
                is_active,
                archived,
                created_at,
                updated_at
            FROM users
            ORDER BY created_at DESC
            """
        )
        rows = cur.fetchall()

    return {
        "ok": True,
        "users": rows
    }


@router.post("/users")
def create_user(
    payload: CreateUserRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id FROM users WHERE email = %s LIMIT 1",
            (payload.email.strip().lower(),)
        )
        existing = cur.fetchone()

        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")

        password_hash = bcrypt.hashpw(
            payload.password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        cur.execute(
            """
            INSERT INTO users (
                first_name,
                last_name,
                email,
                password_hash,
                role,
                home_id,
                is_active,
                archived,
                created_at,
                updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, false, NOW(), NOW())
            RETURNING
                id,
                first_name,
                last_name,
                email,
                role,
                home_id,
                is_active,
                archived,
                created_at,
                updated_at
            """,
            (
                payload.first_name.strip(),
                payload.last_name.strip(),
                payload.email.strip().lower(),
                password_hash,
                payload.role.strip().lower(),
                payload.home_id,
                payload.is_active,
            )
        )
        user = cur.fetchone()

    conn.commit()

    return {
        "ok": True,
        "user": user
    }


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UpdateUserRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    fields = []
    values = []

    if payload.first_name is not None:
        fields.append("first_name = %s")
        values.append(payload.first_name.strip())

    if payload.last_name is not None:
        fields.append("last_name = %s")
        values.append(payload.last_name.strip())

    if payload.email is not None:
        fields.append("email = %s")
        values.append(payload.email.strip().lower())

    if payload.role is not None:
        fields.append("role = %s")
        values.append(payload.role.strip().lower())

    if payload.home_id is not None:
        fields.append("home_id = %s")
        values.append(payload.home_id)

    if payload.is_active is not None:
        fields.append("is_active = %s")
        values.append(payload.is_active)

    if payload.archived is not None:
        fields.append("archived = %s")
        values.append(payload.archived)

    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    fields.append("updated_at = NOW()")
    values.append(user_id)

    query = f"""
        UPDATE users
        SET {", ".join(fields)}
        WHERE id = %s
        RETURNING
            id,
            first_name,
            last_name,
            email,
            role,
            home_id,
            is_active,
            archived,
            created_at,
            updated_at
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, tuple(values))
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    conn.commit()

    return {
        "ok": True,
        "user": user
    }


@router.post("/users/{user_id}/reset-password")
def reset_password(
    user_id: int,
    payload: ResetPasswordRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    password_hash = bcrypt.hashpw(
        payload.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE users
            SET
                password_hash = %s,
                password_reset_expiry = NULL,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, email, first_name, last_name
            """,
            (password_hash, user_id)
        )
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    conn.commit()

    return {
        "ok": True,
        "message": "Password reset",
        "user": user
    }
