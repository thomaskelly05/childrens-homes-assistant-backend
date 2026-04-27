from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext

from auth.dependencies import get_current_user
from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix="/admin/users", tags=["admin-users"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ADMIN_ROLES = {"founder", "owner", "super_admin", "superadmin", "admin"}

VALID_ROLES = {
    "founder",
    "owner",
    "super_admin",
    "admin",
    "responsible_individual",
    "registered_manager",
    "manager",
    "senior",
    "staff",
}


class CreateUserPayload(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str | None = None
    last_name: str | None = None
    role: str = "staff"
    provider_id: int | None = None
    home_id: int | None = None
    home_ids: list[int] = Field(default_factory=list)
    is_active: bool = True
    subscription_active: bool = True


def user_value(user: Any, key: str, default: Any = None) -> Any:
    if isinstance(user, dict):
        return user.get(key, default)
    return getattr(user, key, default)


def current_role(user: Any) -> str:
    return str(
        user_value(user, "role")
        or user_value(user, "user_role")
        or user_value(user, "account_role")
        or ""
    ).strip().lower()


def require_admin(user: Any) -> None:
    if current_role(user) not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin access required.")


def normalise_role(role: str) -> str:
    clean = str(role or "staff").strip().lower()
    if clean not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
    return clean


def rows_to_dicts(cur) -> list[dict[str, Any]]:
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in cur.fetchall()]


def row_to_dict(cur) -> dict[str, Any] | None:
    row = cur.fetchone()
    if row is None:
        return None
    columns = [desc[0] for desc in cur.description]
    return dict(zip(columns, row))


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


@router.get("/options")
def admin_user_options(current_user: Any = Depends(get_current_user)):
    require_admin(current_user)

    conn = None
    try:
        conn = get_db_connection()

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name
                FROM providers
                WHERE archived IS NOT TRUE
                ORDER BY name ASC
                """
            )
            providers = rows_to_dicts(cur)

            cur.execute(
                """
                SELECT id, name, provider_id
                FROM homes
                WHERE archived IS NOT TRUE
                ORDER BY name ASC
                """
            )
            homes = rows_to_dicts(cur)

        return {
            "roles": sorted(VALID_ROLES),
            "providers": providers,
            "homes": homes,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load admin options: {exc}",
        ) from exc
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get("")
def list_admin_users(current_user: Any = Depends(get_current_user)):
    require_admin(current_user)

    conn = None
    try:
        conn = get_db_connection()

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    u.id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.role,
                    u.provider_id,
                    p.name AS provider_name,
                    u.home_id,
                    h.name AS home_name,
                    u.is_active,
                    u.subscription_active,
                    u.account_status,
                    u.created_at,
                    u.updated_at
                FROM users u
                LEFT JOIN providers p ON p.id = u.provider_id
                LEFT JOIN homes h ON h.id = u.home_id
                WHERE u.archived IS NOT TRUE
                ORDER BY u.created_at DESC
                LIMIT 250
                """
            )
            users = rows_to_dicts(cur)

        return {"users": users}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load users: {exc}",
        ) from exc
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post("")
def create_admin_user(
    payload: CreateUserPayload,
    current_user: Any = Depends(get_current_user),
):
    require_admin(current_user)

    role = normalise_role(payload.role)

    home_ids: list[int] = []
    for item in payload.home_ids or []:
        try:
            value = int(item)
            if value > 0 and value not in home_ids:
                home_ids.append(value)
        except Exception:
            continue

    if payload.home_id and int(payload.home_id) not in home_ids:
        home_ids.insert(0, int(payload.home_id))

    conn = None
    try:
        conn = get_db_connection()

        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM users WHERE lower(email) = lower(%s)",
                (payload.email,),
            )

            if cur.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="A user with this email already exists.",
                )

            cur.execute(
                """
                INSERT INTO users (
                    email,
                    password_hash,
                    role,
                    first_name,
                    last_name,
                    provider_id,
                    home_id,
                    is_active,
                    subscription_active,
                    account_status,
                    archived,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    'active', false, now(), now()
                )
                RETURNING id, email, role, first_name, last_name, provider_id, home_id, is_active
                """,
                (
                    payload.email.lower().strip(),
                    hash_password(payload.password),
                    role,
                    payload.first_name,
                    payload.last_name,
                    payload.provider_id,
                    payload.home_id,
                    payload.is_active,
                    payload.subscription_active,
                ),
            )

            user = row_to_dict(cur)
            if not user:
                raise HTTPException(status_code=500, detail="User was not created.")

            user_id = int(user["id"])

            for home_id in home_ids:
                cur.execute(
                    """
                    INSERT INTO staff_home_assignments (
                        user_id,
                        home_id,
                        role,
                        provider_id,
                        created_at
                    )
                    VALUES (%s, %s, %s, %s, now())
                    """,
                    (user_id, home_id, role, payload.provider_id),
                )

                cur.execute(
                    """
                    INSERT INTO organisation_members (
                        provider_id,
                        user_id,
                        home_id,
                        role,
                        created_at
                    )
                    VALUES (%s, %s, %s, %s, now())
                    """,
                    (payload.provider_id, user_id, home_id, role),
                )

        conn.commit()
        return {"ok": True, "user": user}

    except HTTPException:
        if conn is not None:
            conn.rollback()
        raise
    except Exception as exc:
        if conn is not None:
            conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not create user: {exc}",
        ) from exc
    finally:
        if conn is not None:
            release_db_connection(conn)
