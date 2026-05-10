from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor

from auth.dependencies import get_current_user
from db.connection import get_db

router = APIRouter(prefix="/admin/users", tags=["admin-users"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ADMIN_ROLES = {
    "founder",
    "owner",
    "super_admin",
    "superadmin",
    "admin",
    "provider_admin",
}

VALID_ROLES = {
    "founder",
    "owner",
    "super_admin",
    "superadmin",
    "admin",
    "provider_admin",
    "responsible_individual",
    "registered_manager",
    "manager",
    "deputy_manager",
    "senior",
    "senior_rsw",
    "staff",
    "rsw",
    "bank_rsw",
    "therapeutic_practitioner",
    "domestic",
}


class CreateUserPayload(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)
    first_name: str | None = None
    last_name: str | None = None
    role: str = "staff"
    provider_id: int | None = None
    home_id: int | None = None
    home_ids: list[int] = Field(default_factory=list)
    is_active: bool = True
    subscription_active: bool = True


def require_admin(user: dict[str, Any]) -> None:
    role = str(user.get("role") or "").strip().lower()

    if role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin access required.")


def normalise_role(role: str) -> str:
    clean = str(role or "staff").strip().lower()

    if clean not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

    return clean


def clean_email(email: str) -> str:
    value = str(email or "").strip().lower()

    if "@" not in value:
        raise HTTPException(status_code=400, detail="Valid email required.")

    return value


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def table_exists(conn, table_name: str) -> bool:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name = %s
                ) AS exists
                """,
                (table_name,),
            )
            row = cur.fetchone()
            return bool(row and row.get("exists"))
    except Exception:
        return False


def get_home_provider_id(conn, home_id: int | None) -> int | None:
    if not home_id or not table_exists(conn, "homes"):
        return None

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT provider_id
                FROM homes
                WHERE id = %s
                LIMIT 1
                """,
                (home_id,),
            )
            row = cur.fetchone()

        if not row:
            return None

        value = row.get("provider_id")
        return int(value) if value is not None else None
    except Exception:
        return None


@router.get("/options")
def admin_user_options(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    require_admin(current_user)

    providers: list[dict[str, Any]] = []
    homes: list[dict[str, Any]] = []

    try:
        if table_exists(conn, "providers"):
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, name
                    FROM providers
                    ORDER BY name ASC
                    """
                )
                providers = [dict(row) for row in cur.fetchall()]

        if table_exists(conn, "homes"):
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, name, provider_id
                    FROM homes
                    ORDER BY name ASC
                    """
                )
                homes = [dict(row) for row in cur.fetchall()]

        return {
            "roles": sorted(VALID_ROLES),
            "providers": providers,
            "homes": homes,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load admin options: {exc}",
        ) from exc


@router.get("")
def list_admin_users(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    require_admin(current_user)

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    email,
                    role,
                    home_id,
                    provider_id,
                    first_name,
                    last_name,
                    is_active,
                    created_at,
                    updated_at
                FROM users
                ORDER BY id DESC
                LIMIT 250
                """
            )

            users = [dict(row) for row in cur.fetchall()]

        for user in users:
            user["first_name"] = user.get("first_name") or ""
            user["last_name"] = user.get("last_name") or ""
            user["role"] = user.get("role") or "staff"
            user["provider_name"] = "No provider"
            user["home_name"] = "No main home"
            user["subscription_active"] = False
            user["account_status"] = "unknown"
            user["is_active"] = bool(user.get("is_active"))

        return {"users": users}

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load users: {exc}",
        ) from exc


@router.post("")
def create_admin_user(
    payload: CreateUserPayload,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    require_admin(current_user)

    email = clean_email(payload.email)
    role = normalise_role(payload.role)

    home_ids: list[int] = []

    for item in payload.home_ids or []:
        try:
            value = int(item)
            if value > 0 and value not in home_ids:
                home_ids.append(value)
        except Exception:
            continue

    if payload.home_id:
        main_home_id = int(payload.home_id)
        if main_home_id not in home_ids:
            home_ids.insert(0, main_home_id)

    try:
        provider_id = payload.provider_id

        if not provider_id and payload.home_id:
            provider_id = get_home_provider_id(conn, int(payload.home_id))

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id
                FROM users
                WHERE lower(email) = lower(%s)
                LIMIT 1
                """,
                (email,),
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
                    home_id,
                    provider_id,
                    first_name,
                    last_name,
                    is_active,
                    archived,
                    account_status,
                    subscription_active,
                    subscription_status,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, false,
                    %s, %s, %s, now(), now()
                )
                RETURNING
                    id,
                    email,
                    role,
                    home_id,
                    provider_id,
                    first_name,
                    last_name,
                    is_active,
                    created_at,
                    updated_at
                """,
                (
                    email,
                    hash_password(payload.password),
                    role,
                    payload.home_id,
                    provider_id,
                    payload.first_name or None,
                    payload.last_name or None,
                    payload.is_active,
                    "active" if payload.is_active else "inactive",
                    payload.subscription_active,
                    "active" if payload.subscription_active else "inactive",
                ),
            )

            created_user = dict(cur.fetchone())
            user_id = int(created_user["id"])

            if home_ids and table_exists(conn, "staff_home_assignments"):
                for home_id in home_ids:
                    assignment_provider_id = provider_id or get_home_provider_id(conn, home_id)

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
                        (
                            user_id,
                            home_id,
                            role,
                            assignment_provider_id,
                        ),
                    )

            if home_ids and table_exists(conn, "organisation_members"):
                for home_id in home_ids:
                    member_provider_id = provider_id or get_home_provider_id(conn, home_id)

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
                        (
                            member_provider_id,
                            user_id,
                            home_id,
                            role,
                        ),
                    )

        conn.commit()

        created_user["provider_name"] = "No provider"
        created_user["home_name"] = "No main home"
        created_user["subscription_active"] = payload.subscription_active
        created_user["account_status"] = "active" if payload.is_active else "inactive"

        return {
            "ok": True,
            "user": created_user,
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not create user: {exc}",
        ) from exc
