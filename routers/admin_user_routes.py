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
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, name
                FROM providers
                WHERE COALESCE(archived, false) = false
                ORDER BY name ASC
                """
            )
            providers = [dict(row) for row in cur.fetchall()]

            cur.execute(
                """
                SELECT id, name, provider_id
                FROM homes
                WHERE COALESCE(archived, false) = false
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
        user_columns = get_table_columns(conn, "users")

        optional_selects = []

        if "subscription_active" in user_columns:
            optional_selects.append("COALESCE(u.subscription_active, false) AS subscription_active")
        else:
            optional_selects.append("false AS subscription_active")

        if "account_status" in user_columns:
            optional_selects.append("u.account_status")
        else:
            optional_selects.append("'unknown' AS account_status")

        if "created_at" in user_columns:
            created_order = "u.created_at DESC NULLS LAST, u.id DESC"
            optional_selects.append("u.created_at")
        else:
            created_order = "u.id DESC"
            optional_selects.append("NULL AS created_at")

        if "updated_at" in user_columns:
            optional_selects.append("u.updated_at")
        else:
            optional_selects.append("NULL AS updated_at")

        archived_filter = (
            "WHERE COALESCE(u.archived, false) = false"
            if "archived" in user_columns
            else ""
        )

        query = f"""
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
                COALESCE(u.is_active, false) AS is_active,
                {", ".join(optional_selects)}
            FROM users u
            LEFT JOIN providers p ON p.id = u.provider_id
            LEFT JOIN homes h ON h.id = u.home_id
            {archived_filter}
            ORDER BY {created_order}
            LIMIT 250
        """

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query)
            users = [dict(row) for row in cur.fetchall()]

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
        user_columns = get_table_columns(conn, "users")

        provider_id = payload.provider_id
        if not provider_id and payload.home_id:
            provider_id = get_home_provider_id(conn, int(payload.home_id))

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id FROM users WHERE lower(email) = lower(%s)",
                (email,),
            )

            if cur.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="A user with this email already exists.",
                )

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

            insert_columns = [
                column for column in candidate_values if column in user_columns
            ]

            if "created_at" in user_columns:
                insert_columns.append("created_at")
                candidate_values["created_at"] = "NOW_SQL"

            if "updated_at" in user_columns:
                insert_columns.append("updated_at")
                candidate_values["updated_at"] = "NOW_SQL"

            column_sql = ", ".join(insert_columns)

            placeholders = []
            values = []

            for column in insert_columns:
                if candidate_values[column] == "NOW_SQL":
                    placeholders.append("now()")
                else:
                    placeholders.append("%s")
                    values.append(candidate_values[column])

            placeholder_sql = ", ".join(placeholders)

            cur.execute(
                f"""
                INSERT INTO users ({column_sql})
                VALUES ({placeholder_sql})
                RETURNING id, email, role, first_name, last_name, provider_id, home_id, is_active
                """,
                values,
            )

            user = dict(cur.fetchone())
            user_id = int(user["id"])

            if table_exists(conn, "staff_home_assignments"):
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

                    if "created_at" in assignment_columns:
                        columns.append("created_at")

                    col_sql = ", ".join(columns)
                    ph_sql = ", ".join(["%s"] * len(vals))
                    if "created_at" in assignment_columns:
                        ph_sql = f"{ph_sql}, now()" if ph_sql else "now()"

                    cur.execute(
                        f"""
                        INSERT INTO staff_home_assignments ({col_sql})
                        VALUES ({ph_sql})
                        """,
                        vals,
                    )

            if table_exists(conn, "organisation_members"):
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

                    if "created_at" in member_columns:
                        columns.append("created_at")

                    col_sql = ", ".join(columns)
                    ph_sql = ", ".join(["%s"] * len(vals))
                    if "created_at" in member_columns:
                        ph_sql = f"{ph_sql}, now()" if ph_sql else "now()"

                    cur.execute(
                        f"""
                        INSERT INTO organisation_members ({col_sql})
                        VALUES ({ph_sql})
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
        raise HTTPException(
            status_code=500,
            detail=f"Could not create user: {exc}",
        ) from exc
