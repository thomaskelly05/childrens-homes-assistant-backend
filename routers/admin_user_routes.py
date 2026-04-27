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

ADMIN_ROLES = {"founder", "owner", "super_admin", "superadmin", "admin", "provider_admin"}

VALID_ROLES = {
    "founder", "owner", "super_admin", "superadmin", "admin", "provider_admin",
    "responsible_individual", "registered_manager", "manager", "deputy_manager",
    "senior", "senior_rsw", "staff", "rsw", "bank_rsw",
    "therapeutic_practitioner", "domestic",
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


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def clean_email(email: str) -> str:
    value = str(email or "").strip().lower()
    if "@" not in value:
        raise HTTPException(status_code=400, detail="Valid email required.")
    return value


def get_table_columns(conn, table_name: str) -> set[str]:
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


def table_exists(conn, table_name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = %s
            )
            """,
            (table_name,),
        )
        return bool(cur.fetchone()[0])


def get_home_provider_id(conn, home_id: int | None) -> int | None:
    if not home_id:
        return None
    with conn.cursor() as cur:
        cur.execute("SELECT provider_id FROM homes WHERE id = %s", (home_id,))
        row = cur.fetchone()
        return row[0] if row else None


@router.get("/options")
def admin_user_options(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    require_admin(current_user)

    try:
        providers = []
        homes = []

        if table_exists(conn, "providers"):
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id, name FROM providers ORDER BY name ASC")
                providers = [dict(row) for row in cur.fetchall()]

        if table_exists(conn, "homes"):
            home_columns = get_table_columns(conn, "homes")
            name_col = "name" if "name" in home_columns else "home_name"

            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    SELECT id, {name_col} AS name, provider_id
                    FROM homes
                    ORDER BY {name_col} ASC
                    """
                )
                homes = [dict(row) for row in cur.fetchall()]

        return {"roles": sorted(VALID_ROLES), "providers": providers, "homes": homes}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not load admin options: {exc}") from exc


@router.get("")
def list_admin_users(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    require_admin(current_user)

    try:
        user_columns = get_table_columns(conn, "users")

        fields = ["id", "email"]
        for col in ("first_name", "last_name", "role", "provider_id", "home_id", "is_active", "created_at", "updated_at"):
            if col in user_columns:
                fields.append(col)

        select_sql = ", ".join(fields)
        archived_filter = "WHERE COALESCE(archived, false) = false" if "archived" in user_columns else ""

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT {select_sql}
                FROM users
                {archived_filter}
                ORDER BY id DESC
                LIMIT 250
                """
            )
            users = [dict(row) for row in cur.fetchall()]

        for user in users:
            user.setdefault("first_name", "")
            user.setdefault("last_name", "")
            user.setdefault("role", "staff")
            user.setdefault("provider_id", None)
            user.setdefault("home_id", None)
            user.setdefault("is_active", False)
            user.setdefault("provider_name", "No provider")
            user.setdefault("home_name", "No main home")
            user.setdefault("subscription_active", False)
            user.setdefault("account_status", "unknown")

        return {"users": users}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not load users: {exc}") from exc


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
        user_columns = get_table_columns(conn, "users")
        provider_id = payload.provider_id or get_home_provider_id(conn, payload.home_id)

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id FROM users WHERE lower(email) = lower(%s)", (email,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="A user with this email already exists.")

            candidate_values = {
                "email": email,
                "password_hash": hash_password(payload.password),
                "role": role,
                "first_name": payload.first_name or None,
                "last_name": payload.last_name or None,
                "provider_id": provider_id,
                "home_id": payload.home_id,
                "is_active": payload.is_active,
                "subscription_active": payload.subscription_active,
                "subscription_status": "active" if payload.subscription_active else "inactive",
                "account_status": "active" if payload.is_active else "inactive",
                "archived": False,
            }

            insert_columns = [col for col in candidate_values if col in user_columns]
            values = [candidate_values[col] for col in insert_columns]
            placeholders = ["%s"] * len(values)

            if "created_at" in user_columns:
                insert_columns.append("created_at")
                placeholders.append("now()")

            if "updated_at" in user_columns:
                insert_columns.append("updated_at")
                placeholders.append("now()")

            cur.execute(
                f"""
                INSERT INTO users ({", ".join(insert_columns)})
                VALUES ({", ".join(placeholders)})
                RETURNING id, email, role, first_name, last_name, provider_id, home_id, is_active
                """,
                values,
            )

            user = dict(cur.fetchone())
            user_id = int(user["id"])

            if home_ids and table_exists(conn, "staff_home_assignments"):
                assignment_columns = get_table_columns(conn, "staff_home_assignments")

                for home_id in home_ids:
                    assignment_provider_id = provider_id or get_home_provider_id(conn, home_id)
                    columns = []
                    vals = []

                    for column, value in {
                        "user_id": user_id,
                        "home_id": home_id,
                        "role": role,
                        "provider_id": assignment_provider_id,
                    }.items():
                        if column in assignment_columns:
                            columns.append(column)
                            vals.append(value)

                    placeholders = ["%s"] * len(vals)

                    if "created_at" in assignment_columns:
                        columns.append("created_at")
                        placeholders.append("now()")

                    cur.execute(
                        f"""
                        INSERT INTO staff_home_assignments ({", ".join(columns)})
                        VALUES ({", ".join(placeholders)})
                        """,
                        vals,
                    )

            if home_ids and table_exists(conn, "organisation_members"):
                member_columns = get_table_columns(conn, "organisation_members")

                for home_id in home_ids:
                    member_provider_id = provider_id or get_home_provider_id(conn, home_id)
                    columns = []
                    vals = []

                    for column, value in {
                        "provider_id": member_provider_id,
                        "user_id": user_id,
                        "home_id": home_id,
                        "role": role,
                    }.items():
                        if column in member_columns:
                            columns.append(column)
                            vals.append(value)

                    placeholders = ["%s"] * len(vals)

                    if "created_at" in member_columns:
                        columns.append("created_at")
                        placeholders.append("now()")

                    cur.execute(
                        f"""
                        INSERT INTO organisation_members ({", ".join(columns)})
                        VALUES ({", ".join(placeholders)})
                        """,
                        vals,
                    )

        conn.commit()
        return {"ok": True, "user": user}

    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Could not create user: {exc}") from exc
