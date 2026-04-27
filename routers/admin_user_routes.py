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


def row_value(row: Any, key: str, index: int = 0) -> Any:
    if row is None:
        return None

    if isinstance(row, dict):
        return row.get(key)

    try:
        return row[key]
    except Exception:
        pass

    try:
        return row[index]
    except Exception:
        return None


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

        columns: set[str] = set()
        for row in cur.fetchall():
            value = row_value(row, "column_name", 0)
            if value:
                columns.add(str(value))

        return columns


def table_exists(conn, table_name: str) -> bool:
    with conn.cursor() as cur:
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
        return bool(row_value(row, "exists", 0))


def get_home_provider_id(conn, home_id: int | None) -> int | None:
    if not home_id:
        return None

    if not table_exists(conn, "homes"):
        return None

    with conn.cursor() as cur:
        cur.execute("SELECT provider_id FROM homes WHERE id = %s", (home_id,))
        row = cur.fetchone()
        value = row_value(row, "provider_id", 0)

        try:
            return int(value) if value is not None else None
        except Exception:
            return None


def get_safe_name_column(columns: set[str]) -> str | None:
    for candidate in ("name", "home_name", "title", "display_name"):
        if candidate in columns:
            return candidate
    return None


@router.get("/options")
def admin_user_options(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    require_admin(current_user)

    try:
        providers: list[dict[str, Any]] = []
        homes: list[dict[str, Any]] = []

        if table_exists(conn, "providers"):
            provider_columns = get_table_columns(conn, "providers")
            provider_name_col = get_safe_name_column(provider_columns) or "id"

            provider_archived_filter = (
                "WHERE COALESCE(archived, false) = false"
                if "archived" in provider_columns
                else ""
            )

            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    SELECT
                        id,
                        {provider_name_col} AS name
                    FROM providers
                    {provider_archived_filter}
                    ORDER BY {provider_name_col} ASC
                    """
                )
                providers = [dict(row) for row in cur.fetchall()]

        if table_exists(conn, "homes"):
            home_columns = get_table_columns(conn, "homes")
            home_name_col = get_safe_name_column(home_columns) or "id"

            provider_select = (
                "provider_id"
                if "provider_id" in home_columns
                else "NULL::integer AS provider_id"
            )

            home_archived_filter = (
                "WHERE COALESCE(archived, false) = false"
                if "archived" in home_columns
                else ""
            )

            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    SELECT
                        id,
                        {home_name_col} AS name,
                        {provider_select}
                    FROM homes
                    {home_archived_filter}
                    ORDER BY {home_name_col} ASC
                    """
                )
                homes = [dict(row) for row in cur.fetchall()]

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


@router.get("")
def list_admin_users(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    require_admin(current_user)

    try:
        if not table_exists(conn, "users"):
            raise HTTPException(status_code=500, detail="Users table does not exist.")

        user_columns = get_table_columns(conn, "users")

        select_parts = ["id"]

        for column, fallback in {
            "email": "''",
            "first_name": "''",
            "last_name": "''",
            "role": "'staff'",
            "provider_id": "NULL::integer",
            "home_id": "NULL::integer",
            "is_active": "false",
            "subscription_active": "false",
            "account_status": "'unknown'",
            "created_at": "NULL",
            "updated_at": "NULL",
        }.items():
            if column in user_columns:
                if column in {"first_name", "last_name", "role", "email"}:
                    select_parts.append(f"COALESCE({column}, {fallback}) AS {column}")
                elif column in {"is_active", "subscription_active"}:
                    select_parts.append(f"COALESCE({column}, false) AS {column}")
                else:
                    select_parts.append(column)
            else:
                select_parts.append(f"{fallback} AS {column}")

        archived_filter = (
            "WHERE COALESCE(archived, false) = false"
            if "archived" in user_columns
            else ""
        )

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT {", ".join(select_parts)}
                FROM users
                {archived_filter}
                ORDER BY id DESC
                LIMIT 250
                """
            )
            users = [dict(row) for row in cur.fetchall()]

        provider_lookup: dict[int, str] = {}
        home_lookup: dict[int, str] = {}

        if table_exists(conn, "providers"):
            provider_columns = get_table_columns(conn, "providers")
            provider_name_col = get_safe_name_column(provider_columns)

            if provider_name_col:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f"""
                        SELECT id, {provider_name_col} AS name
                        FROM providers
                        """
                    )
                    provider_lookup = {
                        int(row["id"]): str(row["name"])
                        for row in cur.fetchall()
                        if row.get("id") is not None
                    }

        if table_exists(conn, "homes"):
            home_columns = get_table_columns(conn, "homes")
            home_name_col = get_safe_name_column(home_columns)

            if home_name_col:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f"""
                        SELECT id, {home_name_col} AS name
                        FROM homes
                        """
                    )
                    home_lookup = {
                        int(row["id"]): str(row["name"])
                        for row in cur.fetchall()
                        if row.get("id") is not None
                    }

        for user in users:
            provider_id = user.get("provider_id")
            home_id = user.get("home_id")

            try:
                provider_key = int(provider_id) if provider_id is not None else None
            except Exception:
                provider_key = None

            try:
                home_key = int(home_id) if home_id is not None else None
            except Exception:
                home_key = None

            user["provider_name"] = (
                provider_lookup.get(provider_key, "No provider")
                if provider_key is not None
                else "No provider"
            )
            user["home_name"] = (
                home_lookup.get(home_key, "No main home")
                if home_key is not None
                else "No main home"
            )

        return {"users": users}

    except HTTPException:
        raise
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
        if not table_exists(conn, "users"):
            raise HTTPException(status_code=500, detail="Users table does not exist.")

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

            candidate_values: dict[str, Any] = {
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

            insert_columns: list[str] = []
            insert_values: list[Any] = []
            placeholders: list[str] = []

            for column, value in candidate_values.items():
                if column in user_columns:
                    insert_columns.append(column)
                    insert_values.append(value)
                    placeholders.append("%s")

            if "created_at" in user_columns:
                insert_columns.append("created_at")
                placeholders.append("now()")

            if "updated_at" in user_columns:
                insert_columns.append("updated_at")
                placeholders.append("now()")

            if "email" not in insert_columns or "password_hash" not in insert_columns:
                raise HTTPException(
                    status_code=500,
                    detail="Users table must contain email and password_hash columns.",
                )

            returning_parts = [
                "id",
                "email" if "email" in user_columns else "'' AS email",
                "role" if "role" in user_columns else "'staff' AS role",
                "first_name" if "first_name" in user_columns else "'' AS first_name",
                "last_name" if "last_name" in user_columns else "'' AS last_name",
                "provider_id" if "provider_id" in user_columns else "NULL::integer AS provider_id",
                "home_id" if "home_id" in user_columns else "NULL::integer AS home_id",
                "is_active" if "is_active" in user_columns else "true AS is_active",
            ]

            cur.execute(
                f"""
                INSERT INTO users ({", ".join(insert_columns)})
                VALUES ({", ".join(placeholders)})
                RETURNING {", ".join(returning_parts)}
                """,
                insert_values,
            )

            created = cur.fetchone()
            if not created:
                raise HTTPException(status_code=500, detail="User was not created.")

            user = dict(created)
            user_id = int(user["id"])

            if home_ids and table_exists(conn, "staff_home_assignments"):
                assignment_columns = get_table_columns(conn, "staff_home_assignments")

                for home_id in home_ids:
                    assignment_provider_id = provider_id or get_home_provider_id(conn, home_id)

                    columns: list[str] = []
                    values: list[Any] = []
                    ph: list[str] = []

                    for column, value in {
                        "user_id": user_id,
                        "home_id": home_id,
                        "role": role,
                        "provider_id": assignment_provider_id,
                    }.items():
                        if column in assignment_columns:
                            columns.append(column)
                            values.append(value)
                            ph.append("%s")

                    if "created_at" in assignment_columns:
                        columns.append("created_at")
                        ph.append("now()")

                    if columns:
                        cur.execute(
                            f"""
                            INSERT INTO staff_home_assignments ({", ".join(columns)})
                            VALUES ({", ".join(ph)})
                            """,
                            values,
                        )

            if home_ids and table_exists(conn, "organisation_members"):
                member_columns = get_table_columns(conn, "organisation_members")

                for home_id in home_ids:
                    member_provider_id = provider_id or get_home_provider_id(conn, home_id)

                    columns = []
                    values = []
                    ph = []

                    for column, value in {
                        "provider_id": member_provider_id,
                        "user_id": user_id,
                        "home_id": home_id,
                        "role": role,
                    }.items():
                        if column in member_columns:
                            columns.append(column)
                            values.append(value)
                            ph.append("%s")

                    if "created_at" in member_columns:
                        columns.append("created_at")
                        ph.append("now()")

                    if columns:
                        cur.execute(
                            f"""
                            INSERT INTO organisation_members ({", ".join(columns)})
                            VALUES ({", ".join(ph)})
                            """,
                            values,
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
