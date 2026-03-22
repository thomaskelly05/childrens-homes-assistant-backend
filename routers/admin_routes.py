from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor
import bcrypt

from db.connection import get_db
from auth.tokens import decode_session_token

router = APIRouter(prefix="/admin", tags=["Admin"])

ALLOWED_ROLES = {"admin", "manager", "staff"}


class CreateUserRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    role: str
    home_id: int
    is_active: bool = True


class UpdateUserRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
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


def normalise_role(role: str) -> str:
    value = role.strip().lower()
    if value not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Allowed roles: {', '.join(sorted(ALLOWED_ROLES))}"
        )
    return value


def validate_email(email: str) -> str:
    value = email.strip().lower()
    if not value or "@" not in value or "." not in value.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Invalid email address")
    return value


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
    email = validate_email(payload.email)
    role = normalise_role(payload.role)

    if not payload.first_name.strip():
        raise HTTPException(status_code=400, detail="First name is required")

    if not payload.last_name.strip():
        raise HTTPException(status_code=400, detail="Last name is required")

    if not payload.password.strip():
        raise HTTPException(status_code=400, detail="Password is required")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id FROM users WHERE email = %s LIMIT 1",
            (email,)
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
                email,
                password_hash,
                role,
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
    admin_user_id = admin.get("sub")
    try:
        admin_user_id = int(admin_user_id)
    except (TypeError, ValueError):
        admin_user_id = None

    fields = []
    values = []

    if payload.first_name is not None:
        first_name = payload.first_name.strip()
        if not first_name:
            raise HTTPException(status_code=400, detail="First name cannot be empty")
        fields.append("first_name = %s")
        values.append(first_name)

    if payload.last_name is not None:
        last_name = payload.last_name.strip()
        if not last_name:
            raise HTTPException(status_code=400, detail="Last name cannot be empty")
        fields.append("last_name = %s")
        values.append(last_name)

    if payload.email is not None:
        new_email = validate_email(payload.email)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id FROM users WHERE email = %s AND id != %s LIMIT 1",
                (new_email, user_id)
            )
            existing = cur.fetchone()

        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")

        fields.append("email = %s")
        values.append(new_email)

    if payload.role is not None:
        new_role = normalise_role(payload.role)

        if admin_user_id == user_id and new_role != "admin":
            raise HTTPException(
                status_code=400,
                detail="You cannot remove your own admin role"
            )

        fields.append("role = %s")
        values.append(new_role)

    if payload.home_id is not None:
        fields.append("home_id = %s")
        values.append(payload.home_id)

    if payload.is_active is not None:
        if admin_user_id == user_id and payload.is_active is False:
            raise HTTPException(
                status_code=400,
                detail="You cannot deactivate your own account"
            )

        fields.append("is_active = %s")
        values.append(payload.is_active)

    if payload.archived is not None:
        if admin_user_id == user_id and payload.archived is True:
            raise HTTPException(
                status_code=400,
                detail="You cannot archive your own account"
            )

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
    if not payload.password.strip():
        raise HTTPException(status_code=400, detail="Password is required")

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
