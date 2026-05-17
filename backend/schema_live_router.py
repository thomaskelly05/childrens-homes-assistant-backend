from __future__ import annotations

import datetime
import decimal
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.current_user import get_current_user
from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix="/api/schema-live", tags=["Schema Live API"])

IDENTIFIER_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")
SENSITIVE_NAME_RE = re.compile(r"(password|passwd|secret|token|api_key|apikey|private_key|salt|hash|credential)", re.I)
MANAGER_ROLES = {
    "admin",
    "super_admin",
    "superadmin",
    "provider_admin",
    "provider",
    "responsible_individual",
    "registered_manager",
    "deputy_manager",
    "manager",
}
LEADERSHIP_ONLY_TERMS = (
    "admin",
    "audit",
    "billing",
    "invoice",
    "subscription",
    "user",
    "role",
    "permission",
    "session",
    "security",
    "mfa",
    "passkey",
)
TEXT_TYPES = {"text", "character varying", "character", "json", "jsonb"}

DOMAIN_RULES: list[tuple[tuple[str, ...], dict[str, Any]]] = [
    (("safeguarding", "missing", "allegation", "complaint", "incident", "restraint", "sanction"), {"domain": "safeguarding", "sccif_area": "help and protection", "quality_standard": "The protection of children standard", "regulations": ["Regulation 12", "Regulation 13", "Regulation 35", "Regulation 40"]}),
    (("risk", "assessment", "behaviour"), {"domain": "risk", "sccif_area": "help and protection", "quality_standard": "The protection of children standard", "regulations": ["Regulation 12", "Regulation 13"]}),
    (("health", "medication", "appointment", "camhs", "therapy", "sleep", "nutrition"), {"domain": "health", "sccif_area": "overall experiences and progress", "quality_standard": "The health and well-being standard", "regulations": ["Regulation 10"]}),
    (("education", "pep", "attendance", "exclusion", "learning", "school"), {"domain": "education", "sccif_area": "overall experiences and progress", "quality_standard": "The education standard", "regulations": ["Regulation 8"]}),
    (("family", "contact", "relationship", "sibling"), {"domain": "relationships", "sccif_area": "overall experiences and progress", "quality_standard": "The positive relationships standard", "regulations": ["Regulation 11"]}),
    (("voice", "wishes", "feelings", "keywork", "direct_work", "life_story", "identity"), {"domain": "child_voice", "sccif_area": "overall experiences and progress", "quality_standard": "The children's views, wishes and feelings standard", "regulations": ["Regulation 7"]}),
    (("placement", "admission", "care_plan", "transition", "discharge", "independence"), {"domain": "care_planning", "sccif_area": "overall experiences and progress", "quality_standard": "The quality and purpose of care standard", "regulations": ["Regulation 6", "Regulation 14"]}),
    (("staff", "supervision", "training", "recruitment", "probation", "workforce", "academy"), {"domain": "workforce", "sccif_area": "leadership and management", "quality_standard": "The leadership and management standard", "regulations": ["Regulation 13", "Regulation 31", "Regulation 32", "Regulation 33"]}),
    (("reg44", "reg_44", "reg45", "reg_45", "inspection", "quality", "qa", "oversight", "annex"), {"domain": "inspection_oversight", "sccif_area": "leadership and management", "quality_standard": "The leadership and management standard", "regulations": ["Regulation 44", "Regulation 45", "Regulation 13"]}),
    (("evidence", "document", "upload", "template", "report", "chronology"), {"domain": "evidence", "sccif_area": "leadership and management", "quality_standard": "The leadership and management standard", "regulations": ["Regulation 13", "Regulation 14", "Regulation 45"]}),
    (("home", "provider", "maintenance", "location", "room", "bed"), {"domain": "home_operations", "sccif_area": "leadership and management", "quality_standard": "The quality and purpose of care standard", "regulations": ["Regulation 6", "Regulation 13"]}),
]


def q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def serialise(value: Any) -> Any:
    if isinstance(value, (datetime.datetime, datetime.date, datetime.time)):
        return value.isoformat()
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, list):
        return [serialise(item) for item in value]
    if isinstance(value, dict):
        return {key: serialise(item) for key, item in value.items()}
    return value


def as_dict(row: Any, columns: list[str] | None = None) -> dict[str, Any]:
    if isinstance(row, dict):
        return dict(row)
    if columns:
        return {columns[index]: value for index, value in enumerate(row) if index < len(columns)}
    return dict(row)


def redact(row: dict[str, Any]) -> dict[str, Any]:
    return {key: "[redacted]" if SENSITIVE_NAME_RE.search(str(key)) else serialise(value) for key, value in row.items()}


def rows_to_dicts(cursor: Any, rows: list[Any]) -> list[dict[str, Any]]:
    columns = [column[0] for column in cursor.description or []]
    return [redact(as_dict(row, columns)) for row in rows]


def role_of(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower().replace(" ", "_")


def is_manager(current_user: dict[str, Any]) -> bool:
    return role_of(current_user) in MANAGER_ROLES


def safe_int(value: Any) -> int | None:
    try:
        if value in (None, "", "null", "None"):
            return None
        return int(value)
    except Exception:
        return None


def user_home_id(current_user: dict[str, Any]) -> int | None:
    return safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))


def user_provider_id(current_user: dict[str, Any]) -> int | None:
    return safe_int(current_user.get("provider_id") or current_user.get("providerId"))


def require_identifier(name: str) -> str:
    if not IDENTIFIER_RE.match(name or "") or name.startswith(("pg_", "sql_")):
        raise HTTPException(status_code=404, detail="Unknown schema resource")
    return name


def leadership_only(resource: str) -> bool:
    return any(term in resource.lower() for term in LEADERSHIP_ONLY_TERMS)


def relation_context(resource: str) -> dict[str, Any]:
    name = resource.lower()
    for terms, context in DOMAIN_RULES:
        if any(term in name for term in terms):
            return {**context, "active_child_only": any(term in name for term in ("young", "child", "placement", "daily", "incident", "risk", "safeguarding"))}
    return {"domain": "operations", "sccif_area": "leadership and management", "quality_standard": "The leadership and management standard", "regulations": ["Regulation 13"], "active_child_only": False}


def get_relation(cursor: Any, resource: str) -> dict[str, Any]:
    cursor.execute(
        """
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = %s
          AND table_type IN ('BASE TABLE', 'VIEW')
        UNION ALL
        SELECT matviewname AS table_name, 'MATERIALIZED VIEW' AS table_type
        FROM pg_matviews
        WHERE schemaname = 'public'
          AND matviewname = %s
        LIMIT 1
        """,
        (resource, resource),
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Unknown schema resource")
    return as_dict(row)


def get_columns(cursor: Any, resource: str) -> list[dict[str, Any]]:
    cursor.execute(
        """
        SELECT column_name, data_type, ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
        ORDER BY ordinal_position
        """,
        (resource,),
    )
    return [as_dict(row) for row in cursor.fetchall() or []]


def selectable_columns(columns: list[dict[str, Any]]) -> list[str]:
    names = [str(column["column_name"]) for column in columns]
    safe = [name for name in names if not SENSITIVE_NAME_RE.search(name)]
    return safe or names


def default_order(columns: list[dict[str, Any]]) -> str:
    names = {str(column["column_name"]) for column in columns}
    for name in ("event_datetime", "occurred_at", "created_at", "updated_at", "date", "id"):
        if name in names:
            return f"{q(name)} DESC NULLS LAST"
    return "1"


def build_filters(columns: list[dict[str, Any]], current_user: dict[str, Any], params: dict[str, Any]) -> tuple[list[str], list[Any]]:
    names = {str(column["column_name"]) for column in columns}
    clauses: list[str] = []
    values: list[Any] = []

    def add_equal(column: str, value: Any) -> None:
        if value is not None and column in names:
            clauses.append(f"{q(column)} = %s")
            values.append(value)

    requested_home_id = params.get("home_id") or user_home_id(current_user)
    requested_provider_id = params.get("provider_id") or user_provider_id(current_user)
    if not is_manager(current_user):
        requested_home_id = user_home_id(current_user) or requested_home_id
        requested_provider_id = user_provider_id(current_user) or requested_provider_id

    add_equal("home_id", requested_home_id)
    add_equal("provider_id", requested_provider_id)
    add_equal("young_person_id", params.get("young_person_id"))
    add_equal("child_id", params.get("young_person_id"))
    add_equal("staff_id", params.get("staff_id"))

    status = str(params.get("status") or "").strip()
    if status and "status" in names:
        clauses.append("LOWER(COALESCE(status::text, '')) = LOWER(%s)")
        values.append(status)

    search = str(params.get("search") or "").strip()
    if search:
        searchable = [str(column["column_name"]) for column in columns if column.get("data_type") in TEXT_TYPES and not SENSITIVE_NAME_RE.search(str(column["column_name"]))][:8]
        if searchable:
            clauses.append("(" + " OR ".join(f"{q(column)}::text ILIKE %s" for column in searchable) + ")")
            values.extend([f"%{search}%"] * len(searchable))

    return clauses, values


@router.get("/coverage")
def schema_live_coverage(current_user: dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT table_type, COUNT(*) AS count
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type IN ('BASE TABLE', 'VIEW')
                GROUP BY table_type
                UNION ALL
                SELECT 'MATERIALIZED VIEW' AS table_type, COUNT(*) AS count
                FROM pg_matviews
                WHERE schemaname = 'public'
                """
            )
            rows = rows_to_dicts(cursor, cursor.fetchall() or [])
        return {"ok": True, "coverage": rows, "manager_access": is_manager(current_user)}
    finally:
        release_db_connection(conn)


@router.get("/resources")
def list_schema_resources(type: str = Query(""), search: str = Query(""), current_user: dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT table_name AS name, table_type AS relation_type
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type IN ('BASE TABLE', 'VIEW')
                UNION ALL
                SELECT matviewname AS name, 'MATERIALIZED VIEW' AS relation_type
                FROM pg_matviews
                WHERE schemaname = 'public'
                ORDER BY name
                """
            )
            rows = rows_to_dicts(cursor, cursor.fetchall() or [])
        wanted = type.strip().lower().replace(" ", "_")
        output = []
        for row in rows:
            name = str(row["name"])
            relation_type = str(row["relation_type"])
            normalised_type = relation_type.lower().replace(" ", "_").replace("base_table", "table")
            if wanted and wanted != normalised_type:
                continue
            if search and search.lower() not in name.lower():
                continue
            output.append({"name": name, "relation_type": relation_type, "endpoint": f"/api/schema-live/{name}", "restricted": leadership_only(name) and not is_manager(current_user), "regulatory_context": relation_context(name)})
        return {"ok": True, "resources": output, "count": len(output)}
    finally:
        release_db_connection(conn)


@router.get("/young-people/{young_person_id}/record")
def young_person_schema_record(young_person_id: int, limit_per_resource: int = Query(25, ge=1, le=100), current_user: dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        output: dict[str, Any] = {}
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT table_name AS name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND column_name IN ('young_person_id', 'child_id')
                GROUP BY table_name
                ORDER BY table_name
                """
            )
            resources = [str(as_dict(row).get("name")) for row in cursor.fetchall() or []]
            for resource in resources:
                if leadership_only(resource) and not is_manager(current_user):
                    continue
                columns = get_columns(cursor, resource)
                names = {str(column["column_name"]) for column in columns}
                child_column = "young_person_id" if "young_person_id" in names else "child_id"
                selected = selectable_columns(columns)
                clauses, values = build_filters(columns, current_user, {"young_person_id": young_person_id})
                if f'{q(child_column)} = %s' not in clauses:
                    clauses.append(f"{q(child_column)} = %s")
                    values.append(young_person_id)
                values.append(limit_per_resource)
                cursor.execute(
                    f"SELECT {', '.join(q(name) for name in selected)} FROM public.{q(resource)} WHERE {' AND '.join(clauses)} ORDER BY {default_order(columns)} LIMIT %s",
                    values,
                )
                rows = rows_to_dicts(cursor, cursor.fetchall() or [])
                if rows:
                    output[resource] = {"items": rows, "count": len(rows), "regulatory_context": relation_context(resource)}
        return {"ok": True, "young_person_id": young_person_id, "resources": output, "resource_count": len(output)}
    finally:
        release_db_connection(conn)


@router.get("/{resource}/{record_id}")
def get_schema_resource_record(resource: str, record_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    resource = require_identifier(resource)
    if leadership_only(resource) and not is_manager(current_user):
        raise HTTPException(status_code=403, detail="Manager access is required for this schema resource")
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            get_relation(cursor, resource)
            columns = get_columns(cursor, resource)
            names = {str(column["column_name"]) for column in columns}
            id_column = "id" if "id" in names else next(iter(names), None)
            if not id_column:
                raise HTTPException(status_code=404, detail="Resource has no readable columns")
            selected = selectable_columns(columns)
            clauses, values = build_filters(columns, current_user, {})
            clauses.append(f"{q(id_column)}::text = %s")
            values.append(str(record_id))
            cursor.execute(f"SELECT {', '.join(q(name) for name in selected)} FROM public.{q(resource)} WHERE {' AND '.join(clauses)} LIMIT 1", values)
            rows = rows_to_dicts(cursor, cursor.fetchall() or [])
        if not rows:
            raise HTTPException(status_code=404, detail="Record not found")
        return {"ok": True, "resource": resource, "item": rows[0], "regulatory_context": relation_context(resource)}
    finally:
        release_db_connection(conn)


@router.get("/{resource}")
def list_schema_resource_records(resource: str, limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0, le=10000), search: str = Query(""), home_id: int | None = Query(None), provider_id: int | None = Query(None), young_person_id: int | None = Query(None), staff_id: int | None = Query(None), status: str = Query(""), current_user: dict[str, Any] = Depends(get_current_user)):
    resource = require_identifier(resource)
    if leadership_only(resource) and not is_manager(current_user):
        raise HTTPException(status_code=403, detail="Manager access is required for this schema resource")
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            relation = get_relation(cursor, resource)
            columns = get_columns(cursor, resource)
            selected = selectable_columns(columns)
            clauses, values = build_filters(columns, current_user, {"home_id": home_id, "provider_id": provider_id, "young_person_id": young_person_id, "staff_id": staff_id, "status": status, "search": search})
            where_sql = "WHERE " + " AND ".join(clauses) if clauses else ""
            values.extend([limit, offset])
            cursor.execute(f"SELECT {', '.join(q(name) for name in selected)} FROM public.{q(resource)} {where_sql} ORDER BY {default_order(columns)} LIMIT %s OFFSET %s", values)
            rows = rows_to_dicts(cursor, cursor.fetchall() or [])
        return {"ok": True, "resource": resource, "relation_type": relation.get("table_type"), "items": rows, "count": len(rows), "limit": limit, "offset": offset, "regulatory_context": relation_context(resource)}
    finally:
        release_db_connection(conn)
