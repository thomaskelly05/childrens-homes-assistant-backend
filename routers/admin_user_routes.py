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


def dict_rows(cursor) -> list[dict[str, Any]]:
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def dict_row(cursor) -> dict[str, Any] | None:
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))


def get_columns(conn, table_name: str) -> set[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %s
            """,
            (table_name,),
        )
        return {row[0] for row in cur.fetchall()}


def current_role(user: dict[str, Any]) -> str:
    return str(
        user.get("role")
        or user.get("user_role")
        or user.get("account_role")
        or ""
    ).strip().lower()


def require_admin(user: dict[str, Any]) -> None:
    if current_role(user) not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin access required.")


def normalise_role(role: str) -> str:
    clean = str(role or "staff").strip().lower()
    if clean not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
    return clean


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


@router.get("/options")
def admin_user_options(current_user: dict[str, Any] = Depends(get_current_user)):
    require_admin(current_user)

    conn = get_db_connection()
    try:
        provider_columns = get_columns(conn, "providers")
        home_columns = get_columns(conn, "homes")

        provider_where = "WHERE archived IS NOT TRUE" if "archived" in provider_columns else ""
        home_where = "WHERE archived IS NOT TRUE" if "archived" in home_columns else ""

        home_name_col = "name" if "name" in home_columns else "home_name"

        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, name
                FROM providers
                {provider_where}
                ORDER BY name ASC
                """
            )
            providers = dict_rows(cur)

            cur.execute(
                f"""
                SELECT id, {home_name_col} AS name, provider_id
                FROM homes
                {home_where}
                ORDER BY {home_name_col} ASC
                """
            )
            homes = dict_rows(cur)

        return {
            "roles": sorted(VALID_ROLES),
            "providers": providers,
            "homes": homes,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load admin user options: {exc}",
        ) from exc
    finally:
        release_db_connection(conn)


@router.get("")
def list_admin_users(current_user: dict[str, Any] = Depends(get_current_user)):
    require_admin(current_user)

    conn = get_db_connection()
    try:
        home_columns = get_columns(conn, "homes")
        home_name_col = "name" if "name" in home_columns else "home_name"

        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    u.id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.role,
                    u.provider_id,
                    p.name AS provider_name,
                    u.home_id,
                    h.{home_name_col} AS home_name,
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
            users = dict_rows(cur)

        return {"users": users}
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load admin users: {exc}",
        ) from exc
    finally:
        release_db_connection(conn)


@router.post("")
def create_admin_user(
    payload: CreateUserPayload,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_admin(current_user)

    role = normalise_role(payload.role)
    home_ids = []

    for item in payload.home_ids or []:
        try:
            value = int(item)
            if value > 0 and value not in home_ids:
                home_ids.append(value)
        except Exception:
            continue

    if payload.home_id and payload.home_id not in home_ids:
        home_ids.insert(0, int(payload.home_id))

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM users WHERE lower(email) = lower(%s)",
                (payload.email,),
            )
            existing = cur.fetchone()

            if existing:
                raise HTTPException(
                    status_code=409,
                    detail="A user with this email already exists.",
                )

            password_hash = hash_password(payload.password)

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
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active', FALSE, now(), now()
                )
                RETURNING id, email, role, first_name, last_name, provider_id, home_id, is_active
                """,
                (
                    payload.email.lower(),
                    password_hash,
                    role,
                    payload.first_name,
                    payload.last_name,
                    payload.provider_id,
                    payload.home_id,
                    payload.is_active,
                    payload.subscription_active,
                ),
            )

            user = dict_row(cur)
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
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not create user: {exc}",
        ) from exc
    finally:
        release_db_connection(conn)
