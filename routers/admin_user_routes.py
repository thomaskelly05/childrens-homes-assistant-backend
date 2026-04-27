from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from passlib.context import CryptContext

from auth.dependencies import get_current_user
from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix="/admin/users", tags=["admin-users"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ADMIN_ROLES = {
    "founder",
    "owner",
    "super_admin",
    "superadmin",
    "admin",
    "administrator",
}

VALID_ROLES = {
    "founder",
    "owner",
    "super_admin",
    "superadmin",
    "admin",
    "administrator",
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


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def clean_email(email: str) -> str:
    value = str(email or "").strip().lower()
    if "@" not in value:
        raise HTTPException(status_code=400, detail="Valid email required.")
    return value


def get_home_provider_id(conn, home_id: int | None) -> int | None:
    if not home_id:
        return None

    with conn.cursor() as cur:
        cur.execute("SELECT provider_id FROM homes WHERE id = %s", (home_id,))
        row = cur.fetchone()
        if not row:
            return None
        return row[0]


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
                WHERE COALESCE(archived, false) IS false
                ORDER BY name ASC
                """
            )
            providers = rows_to_dicts(cur)

            cur.execute(
                """
                SELECT id, name, provider_id
                FROM homes
                WHERE COALESCE(archived, false) IS false
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
                    COALESCE(u.is_active, false) AS is_active,
                    COALESCE(u.subscription_active, false) AS subscription_active,
                    u.account_status,
                    u.created_at,
                    u.updated_at
                FROM users u
                LEFT JOIN providers p ON p.id = u.provider_id
                LEFT JOIN homes h ON h.id = u.home_id
                WHERE COALESCE(u.archived, false) IS false
                ORDER BY u.created_at DESC NULLS LAST, u.id DESC
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

    conn = None
    try:
        conn = get_db_connection()
        user_columns = get_table_columns(conn, "users")

        provider_id = payload.provider_id
        if not provider_id and payload.home_id:
            provider_id = get_home_provider_id(conn, int(payload.home_id))

        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM users WHERE lower(email) = lower(%s)",
                (email,),
            )

            if cur.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="A user with this email already exists.",
                )

            values: dict[str, Any] = {
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
                column
                for column in values.keys()
                if column in user_columns
            ]

            placeholders = ", ".join(["%s"] * len(insert_columns))
            column_sql = ", ".join(insert_columns)
            insert_values = [values[column] for column in insert_columns]

            cur.execute(
                f"""
                INSERT INTO users ({column_sql}, created_at, updated_at)
                VALUES ({placeholders}, now(), now())
                RETURNING id, email, role, first_name, last_name, provider_id, home_id, is_active
                """,
                insert_values,
            )

            user = row_to_dict(cur)
            if not user:
                raise HTTPException(status_code=500, detail="User was not created.")

            user_id = int(user["id"])

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
                    (user_id, home_id, role, assignment_provider_id),
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
                    (assignment_provider_id, user_id, home_id, role),
                )

            if "admin_audit_log" in get_existing_tables(conn):
                cur.execute(
                    """
                    INSERT INTO admin_audit_log (
                        admin_user_id,
                        action,
                        target_type,
                        target_id,
                        details,
                        provider_id,
                        created_at
                    )
                    VALUES (%s, 'create_user', 'user', %s, %s::jsonb, %s, now())
                    """,
                    (
                        user_value(current_user, "id") or user_value(current_user, "user_id"),
                        user_id,
                        '{"source":"admin-users-page"}',
                        provider_id,
                    ),
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


def get_existing_tables(conn) -> set[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            """
        )
        return {row[0] for row in cur.fetchall()}
