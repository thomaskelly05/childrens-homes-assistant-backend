from __future__ import annotations

import datetime
import decimal
from typing import Any

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from db.connection import get_db_connection, release_db_connection

router = APIRouter(tags=["frontend-compat"])


ROUTE_TABLES: dict[str, dict[str, str]] = {
    # Service / provider / home fallback routes only.
    # Child record routes such as daily-notes, incidents, risk, keywork,
    # appointments, documents, health, education, family, handover, etc.
    # are intentionally removed because they now have proper routers.

    "reports": {
        "table": "ai_generated_reports",
        "key": "reports",
        "order": "created_at",
    },
    "team": {
        "table": "staff",
        "key": "team",
        "order": "full_name",
    },
    "staff": {
        "table": "staff",
        "key": "staff",
        "order": "full_name",
    },
    "supervisions": {
        "table": "supervision_submissions",
        "key": "supervisions",
        "order": "created_at",
    },
    "training": {
        "table": "staff_training_records",
        "key": "training",
        "order": "expires_on",
    },
    "rota": {
        "table": "roster_shifts",
        "key": "rota",
        "order": "shift_date",
    },
    "compliance-items": {
        "table": "compliance_items",
        "key": "compliance_items",
        "order": "due_date",
    },
    "quality": {
        "table": "quality_audits",
        "key": "quality",
        "order": "audit_date",
    },
    "quality-audits": {
        "table": "quality_audits",
        "key": "quality_audits",
        "order": "audit_date",
    },
    "quality-audit-findings": {
        "table": "quality_audit_findings",
        "key": "quality_audit_findings",
        "order": "created_at",
    },
    "quality-audit-actions": {
        "table": "quality_audit_actions",
        "key": "quality_audit_actions",
        "order": "due_date",
    },
    "ofsted": {
        "table": "inspection_scores",
        "key": "ofsted",
        "order": "created_at",
    },
    "inspection-scores": {
        "table": "inspection_scores",
        "key": "inspection_scores",
        "order": "created_at",
    },
    "inspection-section-scores": {
        "table": "inspection_section_scores",
        "key": "inspection_section_scores",
        "order": "created_at",
    },
    "inspection-score-reasons": {
        "table": "inspection_score_reasons",
        "key": "inspection_score_reasons",
        "order": "created_at",
    },
    "inspection-reasons": {
        "table": "inspection_score_reasons",
        "key": "inspection_reasons",
        "order": "created_at",
    },
    "inspection-lines-of-enquiry": {
        "table": "inspection_lines_of_enquiry",
        "key": "inspection_lines_of_enquiry",
        "order": "created_at",
    },
    "inspection-improvement-actions": {
        "table": "inspection_improvement_actions",
        "key": "inspection_improvement_actions",
        "order": "due_date",
    },
    "inspection-actions": {
        "table": "inspection_improvement_actions",
        "key": "inspection_actions",
        "order": "due_date",
    },
    "inspection-tasks": {
        "table": "inspection_improvement_actions",
        "key": "inspection_tasks",
        "order": "due_date",
    },
    "inspection-briefing": {
        "table": "inspection_dashboard_snapshots",
        "key": "inspection_briefing",
        "order": "created_at",
    },
    "inspection-prep-72-hour": {
        "table": "inspection_pack_jobs",
        "key": "inspection_prep_72_hour",
        "order": "created_at",
    },
    "manager-review-queue": {
        "table": "manager_review_queue",
        "key": "manager_review_queue",
        "order": "created_at",
    },
    "reg44-visits": {
        "table": "reg44_visits",
        "key": "reg44_visits",
        "order": "visit_date",
    },
    "reg44-findings": {
        "table": "reg44_findings",
        "key": "reg44_findings",
        "order": "created_at",
    },
    "reg44-actions": {
        "table": "reg44_actions",
        "key": "reg44_actions",
        "order": "due_date",
    },
    "reg45-reviews": {
        "table": "reg45_reviews",
        "key": "reg45_reviews",
        "order": "review_date",
    },
    "reg45-actions": {
        "table": "reg45_actions",
        "key": "reg45_actions",
        "order": "due_date",
    },
}

CANONICAL_HOME_ROUTE_KEYS = {
    "reports",
    "team",
    "supervisions",
    "training",
    "compliance-items",
    "quality",
    "quality-audits",
    "quality-audit-findings",
    "quality-audit-actions",
    "manager-review-queue",
    "reg44-visits",
    "reg44-findings",
    "reg44-actions",
    "reg45-reviews",
    "reg45-actions",
    "inspection-scores",
    "inspection-section-scores",
    "inspection-score-reasons",
    "inspection-lines-of-enquiry",
    "inspection-improvement-actions",
}

CANONICAL_TOP_LEVEL_ROUTE_KEYS = {"staff"}
CANONICAL_API_ROUTE_KEYS = {"staff", "rota"}


ASSISTANT_CHILD_CONTEXT_ROUTES: dict[str, dict[str, str]] = {
    # Used only inside assistant/context bundle building.
    # These do not register public child record routes.
    "appointments": {
        "table": "young_person_appointments",
        "key": "appointments",
        "order": "appointment_date",
    },
    "daily-notes": {
        "table": "daily_notes",
        "key": "daily_notes",
        "order": "note_date",
    },
    "communications": {
        "table": "communications_log",
        "key": "communications",
        "order": "communication_datetime",
    },
    "incidents": {
        "table": "incidents",
        "key": "incidents",
        "order": "incident_datetime",
    },
    "safeguarding": {
        "table": "safeguarding_records",
        "key": "safeguarding",
        "order": "created_at",
    },
    "support-plans": {
        "table": "support_plans",
        "key": "support_plans",
        "order": "review_date",
    },
    "risk": {
        "table": "risk_assessments",
        "key": "risk",
        "order": "review_date",
    },
    "missing-episodes": {
        "table": "missing_episodes",
        "key": "missing_episodes",
        "order": "missing_from",
    },
    "medication-records": {
        "table": "medication_records",
        "key": "medication_records",
        "order": "administered_at",
    },
    "tasks": {
        "table": "tasks",
        "key": "tasks",
        "order": "due_date",
    },
    "documents": {
        "table": "documents",
        "key": "documents",
        "order": "created_at",
    },
    "statutory-documents": {
        "table": "statutory_documents",
        "key": "statutory_documents",
        "order": "review_date",
    },
    "handover": {
        "table": "handover_records",
        "key": "handover",
        "order": "handover_datetime",
    },
    "health": {
        "table": "health_records",
        "key": "health",
        "order": "record_date",
    },
    "education": {
        "table": "education_records",
        "key": "education",
        "order": "record_date",
    },
    "family": {
        "table": "family_contact_records",
        "key": "family",
        "order": "contact_datetime",
    },
    "keywork": {
        "table": "keywork_sessions",
        "key": "keywork",
        "order": "session_date",
    },
    "timeline": {
        "table": "chronology_events",
        "key": "timeline",
        "order": "event_datetime",
    },
}


CONTEXT_TABLES: dict[str, dict[str, str]] = {
    **ASSISTANT_CHILD_CONTEXT_ROUTES,
    **ROUTE_TABLES,
}


TIMELINE_COMPAT_CATEGORIES: dict[str, str] = {
    "daily-notes": "daily_note",
    "incidents": "incident",
}


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


def rows_to_dicts(cursor: Any, rows: list[Any]) -> list[dict[str, Any]]:
    if not rows:
        return []

    converted: list[dict[str, Any]] = []
    columns = [column[0] for column in cursor.description or []]

    for row in rows:
        if isinstance(row, dict):
            converted.append({key: serialise(value) for key, value in row.items()})
            continue

        converted.append(
            {
                columns[index]: serialise(value)
                for index, value in enumerate(row)
                if index < len(columns)
            }
        )

    return converted


def table_exists(cursor: Any, table_name: str) -> bool:
    cursor.execute(
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
    row = cursor.fetchone()

    if isinstance(row, dict):
        return bool(row.get("exists"))

    return bool(row and row[0])


def get_columns(cursor: Any, table_name: str) -> set[str]:
    cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = %s
        """,
        (table_name,),
    )

    columns: set[str] = set()

    for row in cursor.fetchall():
        if isinstance(row, dict):
            value = row.get("column_name")
        else:
            value = row[0] if row else None

        if value:
            columns.add(str(value))

    return columns


def get_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        number = int(value)
        return number if number > 0 else None
    except Exception:
        return None


def get_context_id(request: Request, key: str) -> int | None:
    return get_int(request.query_params.get(key))


def select_rows(
    *,
    table_name: str,
    record_id: int | None = None,
    young_person_id: int | None = None,
    home_id: int | None = None,
    provider_id: int | None = None,
    limit: int = 100,
    order_column: str | None = None,
) -> list[dict[str, Any]]:
    allowed_tables = {config["table"] for config in CONTEXT_TABLES.values()} | {
        "homes",
        "providers",
        "chronology_events",
        "young_person_chronology",
    }

    if table_name not in allowed_tables:
        return []

    conn = None

    try:
        conn = get_db_connection()

        with conn.cursor() as cursor:
            if not table_exists(cursor, table_name):
                return []

            columns = get_columns(cursor, table_name)

            where: list[str] = []
            params: list[Any] = []

            def add_filter(column: str, value: Any) -> None:
                if value is None or column not in columns:
                    return
                where.append(f'"{column}" = %s')
                params.append(value)

            add_filter("id", record_id)
            add_filter("young_person_id", young_person_id)
            add_filter("home_id", home_id)
            add_filter("provider_id", provider_id)

            if "archived" in columns:
                where.append("(archived IS NULL OR archived = false)")

            if "is_deleted" in columns:
                where.append("(is_deleted IS NULL OR is_deleted = false)")

            sql = f'SELECT * FROM public."{table_name}"'

            if where:
                sql += " WHERE " + " AND ".join(where)

            if order_column and order_column in columns:
                sql += f' ORDER BY "{order_column}" DESC NULLS LAST'
            elif "event_datetime" in columns:
                sql += ' ORDER BY "event_datetime" DESC NULLS LAST'
            elif "occurred_at" in columns:
                sql += ' ORDER BY "occurred_at" DESC NULLS LAST'
            elif "created_at" in columns:
                sql += ' ORDER BY "created_at" DESC NULLS LAST'
            elif "updated_at" in columns:
                sql += ' ORDER BY "updated_at" DESC NULLS LAST'
            elif "id" in columns:
                sql += ' ORDER BY "id" DESC'

            safe_limit = max(1, min(int(limit or 100), 500))
            sql += " LIMIT %s"
            params.append(safe_limit)

            cursor.execute(sql, tuple(params))
            return rows_to_dicts(cursor, cursor.fetchall())

    finally:
        if conn is not None:
            release_db_connection(conn)


def normalise_timeline_row_for_route(row: dict[str, Any], category: str) -> dict[str, Any]:
    normalised = dict(row)

    timeline_date = (
        row.get("event_datetime")
        or row.get("occurred_at")
        or row.get("created_at")
        or row.get("updated_at")
    )

    normalised["record_type"] = row.get("record_type") or row.get("category") or category
    normalised["type"] = row.get("type") or row.get("category") or category
    normalised["source"] = row.get("source") or "timeline"
    normalised["source_table"] = row.get("source_table") or "chronology_events"

    if category == "daily_note":
        normalised["note_date"] = row.get("note_date") or timeline_date
        normalised["note"] = (
            row.get("note")
            or row.get("narrative")
            or row.get("summary")
            or row.get("description")
            or ""
        )
        normalised["daily_note"] = normalised["note"]

    if category == "incident":
        normalised["incident_datetime"] = row.get("incident_datetime") or timeline_date
        normalised["description"] = (
            row.get("description")
            or row.get("narrative")
            or row.get("summary")
            or ""
        )
        normalised["incident_summary"] = row.get("incident_summary") or row.get("summary") or ""

    return normalised


def select_timeline_category_rows(
    *,
    young_person_id: int | None,
    category: str,
    limit: int = 100,
) -> list[dict[str, Any]]:
    if not young_person_id or not category:
        return []

    conn = None

    try:
        conn = get_db_connection()

        with conn.cursor() as cursor:
            table_name = None

            for candidate in ("chronology_events", "young_person_chronology"):
                if table_exists(cursor, candidate):
                    table_name = candidate
                    break

            if not table_name:
                return []

            columns = get_columns(cursor, table_name)

            if "young_person_id" not in columns or "category" not in columns:
                return []

            where = ['"young_person_id" = %s', '"category" = %s']
            params: list[Any] = [young_person_id, category]

            if "archived" in columns:
                where.append("(archived IS NULL OR archived = false)")

            if "is_deleted" in columns:
                where.append("(is_deleted IS NULL OR is_deleted = false)")

            sql = f'SELECT * FROM public."{table_name}" WHERE ' + " AND ".join(where)

            if "event_datetime" in columns:
                sql += ' ORDER BY "event_datetime" DESC NULLS LAST'
            elif "occurred_at" in columns:
                sql += ' ORDER BY "occurred_at" DESC NULLS LAST'
            elif "created_at" in columns:
                sql += ' ORDER BY "created_at" DESC NULLS LAST'
            elif "id" in columns:
                sql += ' ORDER BY "id" DESC'

            safe_limit = max(1, min(int(limit or 100), 500))
            sql += " LIMIT %s"
            params.append(safe_limit)

            cursor.execute(sql, tuple(params))
            rows = rows_to_dicts(cursor, cursor.fetchall())

            return [normalise_timeline_row_for_route(row, category) for row in rows]

    finally:
        if conn is not None:
            release_db_connection(conn)


async def route_payload(
    route_key: str,
    request: Request,
    home_id: int | None = None,
    provider_id: int | None = None,
    limit: int = 100,
):
    config = ROUTE_TABLES[route_key]

    home_id = home_id or get_context_id(request, "home_id")
    provider_id = provider_id or get_context_id(request, "provider_id")

    try:
        rows = select_rows(
            table_name=config["table"],
            home_id=home_id,
            provider_id=provider_id,
            limit=limit,
            order_column=config.get("order"),
        )

        return {
            config["key"]: rows,
            "items": rows,
            "records": rows,
            "count": len(rows),
            "status": "ok",
            "route": route_key,
            "table": config["table"],
            "source": "table",
            "filters": {
                "home_id": home_id,
                "provider_id": provider_id,
            },
        }

    except Exception as error:
        return JSONResponse(
            status_code=200,
            content={
                config["key"]: [],
                "items": [],
                "records": [],
                "count": 0,
                "status": "compat_error_softened",
                "route": route_key,
                "table": config["table"],
                "message": str(error),
                "filters": {
                    "home_id": home_id,
                    "provider_id": provider_id,
                },
            },
        )


def register_route(route_key: str) -> None:
    async def handler(
        request: Request,
        home_id: int | None = Query(default=None),
        provider_id: int | None = Query(default=None),
        limit: int = Query(default=100),
    ):
        return await route_payload(
            route_key,
            request,
            home_id=home_id,
            provider_id=provider_id,
            limit=limit,
        )

    async def home_handler(
        request: Request,
        home_id: int,
        provider_id: int | None = Query(default=None),
        limit: int = Query(default=100),
    ):
        return await route_payload(
            route_key,
            request,
            home_id=home_id,
            provider_id=provider_id,
            limit=limit,
        )

    async def provider_handler(
        request: Request,
        provider_id: int,
        home_id: int | None = Query(default=None),
        limit: int = Query(default=100),
    ):
        return await route_payload(
            route_key,
            request,
            home_id=home_id,
            provider_id=provider_id,
            limit=limit,
        )

    if route_key not in CANONICAL_TOP_LEVEL_ROUTE_KEYS:
        router.add_api_route(f"/{route_key}", handler, methods=["GET"])
    if route_key not in CANONICAL_API_ROUTE_KEYS:
        router.add_api_route(f"/api/{route_key}", handler, methods=["GET"])

    if route_key not in CANONICAL_HOME_ROUTE_KEYS:
        router.add_api_route(
            f"/homes/{{home_id}}/{route_key}",
            home_handler,
            methods=["GET"],
        )
    router.add_api_route(
        f"/api/homes/{{home_id}}/{route_key}",
        home_handler,
        methods=["GET"],
    )

    router.add_api_route(
        f"/providers/{{provider_id}}/{route_key}",
        provider_handler,
        methods=["GET"],
    )
    router.add_api_route(
        f"/api/providers/{{provider_id}}/{route_key}",
        provider_handler,
        methods=["GET"],
    )


for key in ROUTE_TABLES:
    register_route(key)


@router.get("/providers")
@router.get("/api/providers")
async def providers(limit: int = Query(default=100)):
    rows = select_rows(
        table_name="providers",
        limit=limit,
        order_column="name",
    )
    return {
        "providers": rows,
        "items": rows,
        "records": rows,
        "count": len(rows),
        "status": "ok",
        "route": "providers",
        "table": "providers",
    }


async def homes(
    request: Request,
    provider_id: int | None = Query(default=None),
    limit: int = Query(default=100),
):
    provider_id = provider_id or get_context_id(request, "provider_id")
    rows = select_rows(
        table_name="homes",
        provider_id=provider_id,
        limit=limit,
        order_column="name",
    )
    return {
        "homes": rows,
        "items": rows,
        "records": rows,
        "count": len(rows),
        "status": "ok",
        "route": "homes",
        "table": "homes",
    }


@router.get("/me")
@router.get("/api/me")
async def me():
    return {
        "authenticated": True,
        "status": "ok",
        "source": "frontend_compat",
    }


@router.get("/api/auth/check")
async def api_auth_check():
    return {
        "authenticated": True,
        "status": "ok",
        "source": "frontend_compat",
    }


@router.get("/quality/{record_id}")
@router.get("/api/quality/{record_id}")
async def quality_detail(record_id: int):
    config = ROUTE_TABLES["quality"]
    rows = select_rows(
        table_name=config["table"],
        record_id=record_id,
        limit=1,
        order_column=config.get("order"),
    )
    return {
        "quality": rows,
        "item": rows[0] if rows else None,
        "items": rows,
        "records": rows,
        "count": len(rows),
        "status": "ok",
        "route": "quality",
        "record_id": record_id,
    }


@router.get("/ofsted/{record_id}")
@router.get("/api/ofsted/{record_id}")
async def ofsted_detail(record_id: int):
    config = ROUTE_TABLES["ofsted"]
    rows = select_rows(
        table_name=config["table"],
        record_id=record_id,
        limit=1,
        order_column=config.get("order"),
    )
    return {
        "ofsted": rows,
        "item": rows[0] if rows else None,
        "items": rows,
        "records": rows,
        "count": len(rows),
        "status": "ok",
        "route": "ofsted",
        "record_id": record_id,
    }


def source_title(row: dict[str, Any], fallback: str) -> str:
    return (
        row.get("title")
        or row.get("name")
        or row.get("subject")
        or row.get("task")
        or row.get("audit_title")
        or row.get("action_title")
        or row.get("document_type")
        or fallback
    )


def source_summary(row: dict[str, Any]) -> str:
    return (
        row.get("summary")
        or row.get("description")
        or row.get("notes")
        or row.get("details")
        or row.get("concern_details")
        or row.get("narrative")
        or row.get("generated_text")
        or row.get("input_text")
        or ""
    )


def source_date(row: dict[str, Any]) -> Any:
    return (
        row.get("event_datetime")
        or row.get("occurred_at")
        or row.get("created_at")
        or row.get("updated_at")
        or row.get("due_date")
        or row.get("review_date")
        or row.get("appointment_date")
        or row.get("note_date")
        or row.get("incident_datetime")
        or row.get("communication_datetime")
        or row.get("concern_datetime")
        or row.get("audit_date")
        or row.get("visit_date")
    )


def build_bundle_rows(
    *,
    young_person_id: int | None = None,
    home_id: int | None = None,
    provider_id: int | None = None,
) -> tuple[dict[str, list[dict[str, Any]]], list[dict[str, Any]]]:
    bundle: dict[str, list[dict[str, Any]]] = {}
    sources: list[dict[str, Any]] = []

    for route_key, config in CONTEXT_TABLES.items():
        rows = select_rows(
            table_name=config["table"],
            young_person_id=young_person_id,
            home_id=home_id,
            provider_id=provider_id,
            limit=25,
            order_column=config.get("order"),
        )

        timeline_category = TIMELINE_COMPAT_CATEGORIES.get(route_key)
        if not rows and timeline_category and young_person_id:
            rows = select_timeline_category_rows(
                young_person_id=young_person_id,
                category=timeline_category,
                limit=25,
            )

        bundle[config["key"]] = rows

        for row in rows[:5]:
            sources.append(
                {
                    "id": row.get("id"),
                    "record_id": row.get("id"),
                    "source_id": row.get("id"),
                    "record_type": row.get("record_type")
                    or row.get("category")
                    or config["key"],
                    "title": source_title(row, config["key"]),
                    "summary": source_summary(row),
                    "description": source_summary(row),
                    "date": source_date(row),
                    "created_at": row.get("created_at") or source_date(row),
                }
            )

    return bundle, sources


@router.get("/assistant/context")
@router.get("/api/assistant/context")
async def assistant_global_context(
    request: Request,
    young_person_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    provider_id: int | None = Query(default=None),
):
    young_person_id = young_person_id or get_context_id(request, "young_person_id")
    home_id = home_id or get_context_id(request, "home_id")
    provider_id = provider_id or get_context_id(request, "provider_id")

    bundle, sources = build_bundle_rows(
        young_person_id=young_person_id,
        home_id=home_id,
        provider_id=provider_id,
    )

    return {
        "status": "ok",
        "scope": "global",
        "context": bundle,
        "scope_bundle": bundle,
        "bundle": bundle,
        "items": sources,
        "sources": sources,
        "warnings": [],
        "runtime": {
            "source": "frontend_compat_context",
            "evidence_count": len(sources),
            "young_person_id": young_person_id,
            "home_id": home_id,
            "provider_id": provider_id,
        },
    }


@router.get("/young-people/{young_person_id}/assistant/context")
@router.get("/api/young-people/{young_person_id}/assistant/context")
async def assistant_young_person_context(
    young_person_id: int,
    request: Request,
    home_id: int | None = Query(default=None),
    provider_id: int | None = Query(default=None),
):
    home_id = home_id or get_context_id(request, "home_id")
    provider_id = provider_id or get_context_id(request, "provider_id")

    bundle, sources = build_bundle_rows(
        young_person_id=young_person_id,
        home_id=home_id,
        provider_id=provider_id,
    )

    return {
        "status": "ok",
        "scope": "child",
        "young_person_id": young_person_id,
        "context": bundle,
        "scope_bundle": bundle,
        "bundle": bundle,
        "items": sources,
        "sources": sources,
        "warnings": [],
        "runtime": {
            "source": "frontend_compat_child_context",
            "evidence_count": len(sources),
            "young_person_id": young_person_id,
            "home_id": home_id,
            "provider_id": provider_id,
        },
    }


@router.get("/homes/{home_id}/assistant/context")
@router.get("/api/homes/{home_id}/assistant/context")
async def assistant_home_context(
    home_id: int,
    request: Request,
    young_person_id: int | None = Query(default=None),
    provider_id: int | None = Query(default=None),
):
    young_person_id = young_person_id or get_context_id(request, "young_person_id")
    provider_id = provider_id or get_context_id(request, "provider_id")

    bundle, sources = build_bundle_rows(
        young_person_id=young_person_id,
        home_id=home_id,
        provider_id=provider_id,
    )

    return {
        "status": "ok",
        "scope": "home",
        "home_id": home_id,
        "context": bundle,
        "scope_bundle": bundle,
        "bundle": bundle,
        "items": sources,
        "sources": sources,
        "warnings": [],
        "runtime": {
            "source": "frontend_compat_home_context",
            "evidence_count": len(sources),
            "young_person_id": young_person_id,
            "home_id": home_id,
            "provider_id": provider_id,
        },
    }


@router.get("/assistant/scope-bundle")
@router.get("/api/assistant/scope-bundle")
@router.get("/assistant/os/scope-bundle")
@router.get("/api/assistant/os/scope-bundle")
async def assistant_scope_bundle_get(
    request: Request,
    young_person_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    provider_id: int | None = Query(default=None),
):
    young_person_id = young_person_id or get_context_id(request, "young_person_id")
    home_id = home_id or get_context_id(request, "home_id")
    provider_id = provider_id or get_context_id(request, "provider_id")

    bundle, sources = build_bundle_rows(
        young_person_id=young_person_id,
        home_id=home_id,
        provider_id=provider_id,
    )

    return {
        "status": "ok",
        "scope_bundle": bundle,
        "bundle": bundle,
        "items": sources,
        "sources": sources,
        "suggested_actions": [
            "Draft summary",
            "Review overdue items",
            "Check inspection readiness",
            "Review safeguarding records",
        ],
        "runtime": {
            "source": "frontend_compat",
            "evidence_count": len(sources),
            "young_person_id": young_person_id,
            "home_id": home_id,
            "provider_id": provider_id,
        },
    }


@router.post("/assistant/scope-bundle")
@router.post("/api/assistant/scope-bundle")
@router.post("/assistant/os/scope-bundle")
@router.post("/api/assistant/os/scope-bundle")
async def assistant_scope_bundle_post(request: Request):
    try:
        parsed = await request.json()
        body = parsed if isinstance(parsed, dict) else {}
    except Exception:
        body = {}

    context = body.get("context") if isinstance(body.get("context"), dict) else body

    young_person_id = get_int(context.get("young_person_id"))
    home_id = get_int(context.get("home_id"))
    provider_id = get_int(context.get("provider_id"))

    bundle, sources = build_bundle_rows(
        young_person_id=young_person_id,
        home_id=home_id,
        provider_id=provider_id,
    )

    return {
        "status": "ok",
        "scope_bundle": bundle,
        "bundle": bundle,
        "items": sources,
        "sources": sources,
        "suggested_actions": [
            "Draft summary",
            "Review overdue items",
            "Check inspection readiness",
            "Review safeguarding records",
        ],
        "runtime": {
            "source": "frontend_compat",
            "evidence_count": len(sources),
            "young_person_id": young_person_id,
            "home_id": home_id,
            "provider_id": provider_id,
        },
    }


@router.post("/assistant/message")
@router.post("/api/assistant/message")
@router.post("/assistant/os/message")
@router.post("/api/assistant/os/message")
async def assistant_message(request: Request):
    try:
        parsed = await request.json()
        body = parsed if isinstance(parsed, dict) else {}
    except Exception:
        body = {}

    message = str(body.get("message") or "").strip()
    context = body.get("context") if isinstance(body.get("context"), dict) else {}

    young_person_id = get_int(context.get("young_person_id"))
    home_id = get_int(context.get("home_id"))
    provider_id = get_int(context.get("provider_id"))

    _, sources = build_bundle_rows(
        young_person_id=young_person_id,
        home_id=home_id,
        provider_id=provider_id,
    )

    return {
        "answer": (
            "The IndiCare assistant backend compatibility route is connected. "
            f"I can see {len(sources)} evidence item(s) in the current scope."
        ),
        "message": message,
        "sources": sources,
        "suggested_actions": [
            "Draft summary",
            "Review overdue items",
            "Check inspection readiness",
        ],
        "runtime": {
            "source": "frontend_compat_message",
            "evidence_count": len(sources),
            "young_person_id": young_person_id,
            "home_id": home_id,
            "provider_id": provider_id,
        },
        "explainability": {
            "reasoning_summary": "This response used the frontend compatibility scope bundle.",
        },
    }
