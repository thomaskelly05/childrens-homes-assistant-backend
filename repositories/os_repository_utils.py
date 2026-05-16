from __future__ import annotations

from datetime import date, datetime
from typing import Any

from psycopg2.extras import RealDictCursor

from core.policy_engine import context_from_user, policy_engine

ADMIN_ROLES = {"admin", "provider_admin", "super_admin", "founder", "owner"}
MANAGER_ROLES = ADMIN_ROLES | {"manager", "registered_manager", "deputy_manager", "responsible_individual"}
WRITER_ROLES = MANAGER_ROLES | {"staff", "support_worker", "senior_support_worker", "key_worker"}


def safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except Exception:
        return None


def normalise_token(value: Any) -> str:
    return str(value or "").strip().lower().replace("-", "_").replace(" ", "_")


def current_user_id(current_user: dict[str, Any]) -> int | None:
    return safe_int(current_user.get("user_id") or current_user.get("id"))


def current_home_id(current_user: dict[str, Any]) -> int | None:
    return safe_int(current_user.get("home_id") or current_user.get("homeId"))


def current_allowed_home_ids(current_user: dict[str, Any]) -> list[int]:
    return list(context_from_user(current_user).home_ids)


def current_provider_id(current_user: dict[str, Any]) -> int | None:
    return safe_int(current_user.get("provider_id") or current_user.get("providerId"))


def current_role(current_user: dict[str, Any]) -> str:
    return normalise_token(current_user.get("role"))


def is_admin(current_user: dict[str, Any]) -> bool:
    return context_from_user(current_user).tenancy_scope == "platform"


def is_manager(current_user: dict[str, Any]) -> bool:
    return policy_engine.has_permission(current_user, "governance:review") or current_role(current_user) in MANAGER_ROLES


def can_write_records(current_user: dict[str, Any]) -> bool:
    return policy_engine.has_permission(current_user, "records:write") or current_role(current_user) in WRITER_ROLES


def table_exists(conn: Any, table_name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT to_regclass(%s) IS NOT NULL AS exists", (f"public.{table_name}",))
        row = cur.fetchone()
    if isinstance(row, dict):
        return bool(row.get("exists"))
    return bool(row and row[0])


def first_existing_table(conn: Any, candidates: list[str]) -> str | None:
    for table_name in candidates:
        if table_exists(conn, table_name):
            return table_name
    return None


def table_columns(conn: Any, table_name: str) -> set[str]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            """,
            (table_name,),
        )
        rows = cur.fetchall() or []
    return {str(row.get("column_name")) for row in rows if row.get("column_name")}


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def first_col(cols: set[str], candidates: list[str]) -> str | None:
    for col in candidates:
        if col in cols:
            return col
    return None


def text_expr(cols: set[str], candidates: list[str], default: str = "''") -> str:
    parts = [f"{quote_ident(col)}::text" for col in candidates if col in cols]
    if not parts:
        return default
    return f"COALESCE({', '.join(parts)}, {default})"


def value_expr(cols: set[str], candidates: list[str], default: str = "NULL") -> str:
    parts = [quote_ident(col) for col in candidates if col in cols]
    if not parts:
        return default
    return f"COALESCE({', '.join(parts)}, {default})"


def timestamptz_expr(cols: set[str], candidates: list[str]) -> str:
    parts = [f"{quote_ident(col)}::timestamptz" for col in candidates if col in cols]
    if not parts:
        return "NOW()"
    return f"COALESCE({', '.join(parts)}, NOW())"


def json_expr(cols: set[str], candidates: list[str]) -> str:
    parts = [f"to_jsonb({quote_ident(col)})" for col in candidates if col in cols]
    if not parts:
        return "'{}'::jsonb"
    return f"COALESCE({', '.join(parts)}, '{{}}'::jsonb)"


def array_text(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if item is not None and str(item)]
    if isinstance(value, tuple):
        return [str(item) for item in value if item is not None and str(item)]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return [str(value)]


def isoformat(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def normalise_status(value: Any) -> str:
    status = normalise_token(value)
    if status in {"completed", "complete", "closed", "done", "resolved", "approved", "finalised", "finalized"}:
        return "completed"
    if status in {"in_progress", "inprogress", "awaiting", "pending", "review", "manager_review"}:
        return "in_progress"
    if status in {"overdue", "late"}:
        return "overdue"
    if status in {"blocked", "returned", "changes_requested"}:
        return "blocked"
    return status or "open"


def normalise_priority(value: Any) -> str:
    priority = normalise_token(value)
    if priority in {"critical", "urgent"}:
        return "urgent"
    if priority in {"high", "medium", "low"}:
        return priority
    return "medium"


def normalise_severity(value: Any) -> str:
    severity = normalise_token(value)
    if severity in {"critical", "high", "medium", "low"}:
        return severity
    if severity in {"urgent"}:
        return "critical"
    return "medium"


def build_scope_where(
    cols: set[str],
    current_user: dict[str, Any],
    *,
    home_id: int | None = None,
    young_person_id: int | None = None,
    staff_id: int | None = None,
    provider_id: int | None = None,
) -> tuple[list[str], list[Any]]:
    where: list[str] = []
    params: list[Any] = []

    context = context_from_user(current_user)
    resolved_provider = provider_id if provider_id is not None else context.provider_id
    allowed_home_ids = list(context.home_ids)

    if context.tenancy_scope != "platform" and "home_id" in cols:
        if home_id is not None:
            if context.can_access_home(home_id):
                where.append("home_id = %s")
                params.append(home_id)
            else:
                where.append("1 = 0")
        elif len(allowed_home_ids) == 1:
            where.append("home_id = %s")
            params.append(allowed_home_ids[0])
        elif allowed_home_ids:
            where.append("home_id = ANY(%s)")
            params.append(allowed_home_ids)
        else:
            where.append("1 = 0")
    elif home_id is not None and "home_id" in cols:
        where.append("home_id = %s")
        params.append(home_id)

    if provider_id is not None and "provider_id" in cols:
        where.append("provider_id = %s")
        params.append(provider_id)
    elif resolved_provider is not None and context.tenancy_scope != "platform" and "provider_id" in cols:
        where.append("provider_id = %s")
        params.append(resolved_provider)

    if young_person_id is not None and "young_person_id" in cols:
        where.append("young_person_id = %s")
        params.append(young_person_id)

    if staff_id is not None:
        staff_col = first_col(cols, ["staff_id", "staff_user_id", "owner_id", "assigned_to_user_id", "created_by", "author_id"])
        if staff_col:
            where.append(f"{quote_ident(staff_col)} = %s")
            params.append(staff_id)

    if "archived" in cols:
        where.append("COALESCE(archived, FALSE) = FALSE")

    return where, params

