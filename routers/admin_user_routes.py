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


def current_role(user: dict[str, Any]) -> str:
    return str(user.get("role") or user.get("user_role") or "").strip().lower()


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
async def admin_user_options(current_user: dict[str, Any] = Depends(get_current_user)):
    require_admin(current_user)

    conn = await get_db_connection()
    try:
        providers = await conn.fetch(
            """
            SELECT id, name
            FROM providers
            WHERE archived IS NOT TRUE
            ORDER BY name ASC
            """
        )

        homes = await conn.fetch(
            """
            SELECT id, name, provider_id
            FROM homes
            WHERE archived IS NOT TRUE
            ORDER BY name ASC
            """
        )

        return {
            "roles": sorted(VALID_ROLES),
            "providers": [dict(row) for row in providers],
            "homes": [dict(row) for row in homes],
        }
    finally:
        await release_db_connection(conn)


@router.get("")
async def list_admin_users(current_user: dict[str, Any] = Depends(get_current_user)):
    require_admin(current_user)

    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
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

        return {"users": [dict(row) for row in rows]}
    finally:
        await release_db_connection(conn)


@router.post("")
async def create_admin_user(
    payload: CreateUserPayload,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_admin(current_user)

    role = normalise_role(payload.role)
    home_ids = list(dict.fromkeys([int(item) for item in payload.home_ids if int(item) > 0]))

    if payload.home_id and payload.home_id not in home_ids:
        home_ids.insert(0, int(payload.home_id))

    conn = await get_db_connection()
    try:
        existing = await conn.fetchrow(
            "SELECT id FROM users WHERE lower(email) = lower($1)",
            payload.email,
        )

        if existing:
            raise HTTPException(status_code=409, detail="A user with this email already exists.")

        password_hash = hash_password(payload.password)

        row = await conn.fetchrow(
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
                $1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', FALSE, now(), now()
            )
            RETURNING id, email, role, first_name, last_name, provider_id, home_id, is_active
            """,
            payload.email.lower(),
            password_hash,
            role,
            payload.first_name,
            payload.last_name,
            payload.provider_id,
            payload.home_id,
            payload.is_active,
            payload.subscription_active,
        )

        user_id = int(row["id"])

        for home_id in home_ids:
            await conn.execute(
                """
                INSERT INTO staff_home_assignments (
                    user_id,
                    home_id,
                    role,
                    provider_id,
                    created_at
                )
                VALUES ($1, $2, $3, $4, now())
                """,
                user_id,
                home_id,
                role,
                payload.provider_id,
            )

            await conn.execute(
                """
                INSERT INTO organisation_members (
                    provider_id,
                    user_id,
                    home_id,
                    role,
                    created_at
                )
                VALUES ($1, $2, $3, $4, now())
                """,
                payload.provider_id,
                user_id,
                home_id,
                role,
            )

        return {"ok": True, "user": dict(row)}
    finally:
        await release_db_connection(conn)
