from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from psycopg2.extras import RealDictCursor

from repositories.actions_repository import list_actions
from repositories.documents_repository import list_documents
from repositories.evidence_repository import list_evidence
from repositories.os_repository_utils import build_scope_where, current_home_id, is_admin, quote_ident, safe_int, table_columns, table_exists
from repositories.reports_repository import list_reports
from services.os_chronology_service import list_chronology


def _young_person_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row.get("id") or row.get("young_person_id")),
        "home_id": str(row["home_id"]) if row.get("home_id") is not None else None,
        "first_name": row.get("first_name"),
        "last_name": row.get("last_name"),
        "preferred_name": row.get("preferred_name") or row.get("display_name") or row.get("first_name"),
        "display_name": row.get("display_name") or " ".join([str(row.get("first_name") or ""), str(row.get("last_name") or "")]).strip(),
        "date_of_birth": str(row.get("date_of_birth")) if row.get("date_of_birth") is not None else None,
        "age": row.get("age"),
        "placement_status": row.get("placement_status") or row.get("status") or "active",
        "key_worker_id": str(row.get("primary_keyworker_id")) if row.get("primary_keyworker_id") is not None else None,
        "risk_level": row.get("summary_risk_level") or row.get("risk_level") or row.get("os_state") or "medium",
        "legal_status": row.get("legal_status") or row.get("legal_status_summary"),
        "care_planning": row.get("care_planning") or row.get("placement_plan_summary"),
        "photo_url": row.get("photo_url"),
        "status": row.get("placement_status") or row.get("status") or "active",
        "metadata": {key: value for key, value in row.items() if key not in {"id", "young_person_id"}},
    }


def list_young_people(conn: Any, *, current_user: dict[str, Any], limit: int = 250) -> list[dict[str, Any]]:
    table_name = "vw_os_young_person_profile" if table_exists(conn, "vw_os_young_person_profile") else "young_people"
    if not table_exists(conn, table_name):
        return []
    cols = table_columns(conn, table_name)
    select_cols = [
        col
        for col in [
            "id",
            "young_person_id",
            "home_id",
            "first_name",
            "last_name",
            "preferred_name",
            "display_name",
            "date_of_birth",
            "age",
            "placement_status",
            "primary_keyworker_id",
            "summary_risk_level",
            "risk_level",
            "os_state",
            "legal_status",
            "legal_status_summary",
            "care_planning",
            "placement_plan_summary",
            "photo_url",
            "status",
            "archived",
            "created_at",
            "updated_at",
        ]
        if col in cols
    ]
    if not select_cols:
        return []
    where, params = build_scope_where(cols, current_user)
    params.append(max(1, min(int(limit or 250), 600)))
    where_sql = "WHERE " + " AND ".join(where) if where else ""
    order_col = "display_name" if "display_name" in cols else "last_name" if "last_name" in cols else select_cols[0]
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {", ".join(quote_ident(col) for col in select_cols)}
            FROM public.{quote_ident(table_name)}
            {where_sql}
            ORDER BY {quote_ident(order_col)} ASC NULLS LAST
            LIMIT %s
            """,
            tuple(params),
        )
        rows = [dict(row) for row in (cur.fetchall() or [])]
    return [_young_person_row(row) for row in rows]


def get_young_person(conn: Any, *, young_person_id: int, current_user: dict[str, Any]) -> dict[str, Any] | None:
    for person in list_young_people(conn, current_user=current_user, limit=600):
        if safe_int(person.get("id")) == young_person_id:
            return person
    return None


def young_person_workspace(conn: Any, *, young_person_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    person = get_young_person(conn, young_person_id=young_person_id, current_user=current_user)
    if not person:
        raise HTTPException(status_code=404, detail="Young person not found.")
    filters = {"young_person_id": young_person_id}
    chronology = list_chronology(current_user=current_user, filters=filters, page=1, page_size=50)
    return {
        "young_person": person,
        "chronology": chronology["items"],
        "actions": list_actions(conn, current_user=current_user, filters=filters, limit=100),
        "evidence": list_evidence(conn, current_user=current_user, filters=filters, limit=100),
        "documents": list_documents(conn, current_user=current_user, filters=filters, limit=100),
        "reports": list_reports(conn, current_user=current_user, filters=filters, limit=100),
        "lifecycle": {
            "entity_type": "young_person",
            "entity_id": str(young_person_id),
            "status": person.get("placement_status") or "active",
            "label": "Placement active" if (person.get("placement_status") or "active") == "active" else str(person.get("placement_status")),
            "next_steps": ["Review chronology, actions and evidence gaps before report generation."],
        },
    }


def _staff_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row.get("id")),
        "home_id": str(row["home_id"]) if row.get("home_id") is not None else None,
        "provider_id": str(row["provider_id"]) if row.get("provider_id") is not None else None,
        "first_name": row.get("first_name"),
        "last_name": row.get("last_name"),
        "display_name": " ".join([str(row.get("first_name") or ""), str(row.get("last_name") or "")]).strip() or row.get("email"),
        "email": row.get("email"),
        "role": row.get("role"),
        "status": "inactive" if row.get("is_active") is False or row.get("archived") is True else "active",
        "permissions": row.get("permissions") or [],
    }


def list_adults(conn: Any, *, current_user: dict[str, Any], limit: int = 250) -> list[dict[str, Any]]:
    if not table_exists(conn, "users"):
        return []
    cols = table_columns(conn, "users")
    select_cols = [col for col in ["id", "email", "role", "home_id", "provider_id", "first_name", "last_name", "is_active", "archived", "permissions"] if col in cols]
    where = []
    params: list[Any] = []
    if not is_admin(current_user) and current_home_id(current_user) is not None and "home_id" in cols:
        where.append("home_id = %s")
        params.append(current_home_id(current_user))
    if "archived" in cols:
        where.append("COALESCE(archived, FALSE) = FALSE")
    params.append(max(1, min(int(limit or 250), 600)))
    where_sql = "WHERE " + " AND ".join(where) if where else ""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {", ".join(quote_ident(col) for col in select_cols)}
            FROM public.users
            {where_sql}
            ORDER BY last_name ASC NULLS LAST, first_name ASC NULLS LAST, id ASC
            LIMIT %s
            """,
            tuple(params),
        )
        rows = [dict(row) for row in (cur.fetchall() or [])]
    return [_staff_row(row) for row in rows]


def get_adult(conn: Any, *, adult_id: int, current_user: dict[str, Any]) -> dict[str, Any] | None:
    for adult in list_adults(conn, current_user=current_user, limit=600):
        if safe_int(adult.get("id")) == adult_id:
            return adult
    return None


def adult_workspace(conn: Any, *, adult_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    adult = get_adult(conn, adult_id=adult_id, current_user=current_user)
    if not adult:
        raise HTTPException(status_code=404, detail="Staff member not found.")
    filters = {"owner_user_id": adult_id}
    return {
        "adult": adult,
        "actions": list_actions(conn, current_user=current_user, filters=filters, limit=100),
        "records_authored": list_chronology(current_user=current_user, filters={"staff_id": adult_id}, page=1, page_size=50)["items"],
        "lifecycle": {
            "entity_type": "staff",
            "entity_id": str(adult_id),
            "status": adult.get("status") or "active",
            "label": "Active staff profile" if adult.get("status") == "active" else str(adult.get("status")),
            "next_steps": ["Review actions, supervision and training links where available."],
        },
    }

