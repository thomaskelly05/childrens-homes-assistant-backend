from __future__ import annotations

import logging
from datetime import date
from typing import Any

from psycopg2.extras import RealDictCursor

from repositories.os_repository_utils import current_home_id, current_provider_id, current_role, is_admin, quote_ident, table_columns, table_exists

logger = logging.getLogger(__name__)

OVERSIGHT_ROLES = {
    "admin",
    "provider_admin",
    "super_admin",
    "superadmin",
    "founder",
    "owner",
    "responsible_individual",
    "ri",
    "registered_manager",
    "manager",
}

SELECT_CANDIDATES = [
    "id",
    "young_person_id",
    "home_id",
    "provider_id",
    "first_name",
    "last_name",
    "preferred_name",
    "display_name",
    "date_of_birth",
    "age",
    "gender",
    "admission_date",
    "placement_status",
    "primary_keyworker_id",
    "key_worker_id",
    "summary_risk_level",
    "risk_level",
    "os_state",
    "legal_status",
    "legal_status_summary",
    "care_planning",
    "current_placement_plan_status",
    "placement_plan_summary",
    "photo_url",
    "profile_photo_path",
    "placing_authority",
    "social_worker_name",
    "social_worker_email",
    "social_worker_phone",
    "status",
    "archived",
    "created_at",
    "updated_at",
]


def _age(value: Any) -> int | None:
    if not value:
        return None
    try:
        dob = value if isinstance(value, date) else date.fromisoformat(str(value)[:10])
    except Exception:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _row(row: dict[str, Any]) -> dict[str, Any]:
    display = row.get("display_name") or " ".join([str(row.get("first_name") or ""), str(row.get("last_name") or "")]).strip()
    return {
        "id": str(row.get("id") or row.get("young_person_id")),
        "home_id": str(row["home_id"]) if row.get("home_id") is not None else None,
        "provider_id": str(row["provider_id"]) if row.get("provider_id") is not None else None,
        "first_name": row.get("first_name"),
        "last_name": row.get("last_name"),
        "preferred_name": row.get("preferred_name") or display or row.get("first_name"),
        "display_name": display,
        "date_of_birth": str(row.get("date_of_birth")) if row.get("date_of_birth") is not None else None,
        "age": row.get("age") if row.get("age") is not None else _age(row.get("date_of_birth")),
        "gender": row.get("gender"),
        "admission_date": str(row.get("admission_date")) if row.get("admission_date") is not None else None,
        "placement_status": row.get("placement_status") or row.get("status") or "active",
        "primary_keyworker_id": str(row.get("primary_keyworker_id")) if row.get("primary_keyworker_id") is not None else None,
        "key_worker_id": str(row.get("key_worker_id") or row.get("primary_keyworker_id")) if row.get("key_worker_id") is not None or row.get("primary_keyworker_id") is not None else None,
        "summary_risk_level": row.get("summary_risk_level") or row.get("risk_level") or row.get("os_state") or "medium",
        "risk_level": row.get("summary_risk_level") or row.get("risk_level") or row.get("os_state") or "medium",
        "legal_status": row.get("legal_status") or row.get("legal_status_summary"),
        "legal_status_summary": row.get("legal_status_summary") or row.get("legal_status"),
        "care_planning": row.get("current_placement_plan_status") or row.get("care_planning") or row.get("placement_plan_summary"),
        "current_placement_plan_status": row.get("current_placement_plan_status") or row.get("care_planning") or row.get("placement_plan_summary"),
        "photo_url": row.get("photo_url"),
        "profile_photo_path": row.get("profile_photo_path"),
        "placing_authority": row.get("placing_authority"),
        "social_worker_name": row.get("social_worker_name"),
        "social_worker_email": row.get("social_worker_email"),
        "social_worker_phone": row.get("social_worker_phone"),
        "status": row.get("placement_status") or row.get("status") or "active",
    }


def _fallback_rows(conn: Any, current_user: dict[str, Any], limit: int) -> list[dict[str, Any]]:
    if not table_exists(conn, "young_people"):
        return []
    cols = table_columns(conn, "young_people")
    select_cols = [col for col in SELECT_CANDIDATES if col in cols]
    if not select_cols:
        return []
    role = current_role(current_user)
    home_id = current_home_id(current_user)
    provider_id = current_provider_id(current_user)
    where: list[str] = []
    params: list[Any] = []

    if home_id is not None and "home_id" in cols:
        where.append("home_id = %s")
        params.append(home_id)
    elif provider_id is not None and "provider_id" in cols:
        where.append("provider_id = %s")
        params.append(provider_id)
    elif not (is_admin(current_user) or role in OVERSIGHT_ROLES):
        return []

    if "archived" in cols:
        where.append("COALESCE(archived, FALSE) = FALSE")
    where_sql = "WHERE " + " AND ".join(where) if where else ""
    order_col = "display_name" if "display_name" in cols else "last_name" if "last_name" in cols else select_cols[0]
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {', '.join(quote_ident(col) for col in select_cols)}
            FROM public.young_people
            {where_sql}
            ORDER BY {quote_ident(order_col)} ASC NULLS LAST
            LIMIT %s
            """,
            tuple([*params, max(1, min(int(limit or 250), 600))]),
        )
        return [_row(dict(row)) for row in (cur.fetchall() or [])]


def apply() -> None:
    try:
        import repositories.workspaces_repository as workspace_repo
    except Exception:
        logger.warning("Could not import workspaces repository for live child scope patch", exc_info=True)
        return
    original = workspace_repo.list_young_people
    if getattr(original, "_indicare_live_scope_patched", False):
        return

    def patched_list_young_people(conn: Any, *, current_user: dict[str, Any], limit: int = 250) -> list[dict[str, Any]]:
        rows = original(conn, current_user=current_user, limit=limit)
        if rows:
            return rows
        fallback = _fallback_rows(conn, current_user, limit)
        if fallback:
            logger.info(
                "live child selector recovered rows with fallback scope user_id=%s role=%s home_id=%s provider_id=%s count=%s",
                current_user.get("id") or current_user.get("user_id"),
                current_user.get("role"),
                current_user.get("home_id"),
                current_user.get("provider_id"),
                len(fallback),
            )
        return fallback

    patched_list_young_people._indicare_live_scope_patched = True  # type: ignore[attr-defined]
    workspace_repo.list_young_people = patched_list_young_people


apply()
