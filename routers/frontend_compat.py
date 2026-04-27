from __future__ import annotations

import datetime
import decimal
from typing import Any

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from db.connection import get_db_connection, release_db_connection

router = APIRouter(tags=["frontend-compat"])


ROUTE_TABLES = {
    "appointments": {"table": "young_person_appointments", "key": "appointments", "order": "appointment_date"},
    "daily-notes": {"table": "daily_notes", "key": "daily_notes", "order": "note_date"},
    "communications": {"table": "communications_log", "key": "communications", "order": "communication_datetime"},
    "incidents": {"table": "incidents", "key": "incidents", "order": "incident_datetime"},
    "safeguarding": {"table": "safeguarding_records", "key": "safeguarding", "order": "concern_datetime"},
    "support-plans": {"table": "support_plans", "key": "support_plans", "order": "review_date"},
    "tasks": {"table": "tasks", "key": "tasks", "order": "due_date"},
    "documents": {"table": "documents", "key": "documents", "order": "created_at"},
    "reports": {"table": "ai_generated_reports", "key": "reports", "order": "created_at"},
    "team": {"table": "staff", "key": "team", "order": "full_name"},
    "staff": {"table": "staff", "key": "staff", "order": "full_name"},
    "supervisions": {"table": "supervision_sessions", "key": "supervisions", "order": "scheduled_date"},
    "compliance-items": {"table": "compliance_items", "key": "compliance_items", "order": "due_date"},
    "quality-audits": {"table": "quality_audits", "key": "quality_audits", "order": "audit_date"},
    "inspection-scores": {"table": "inspection_scores", "key": "inspection_scores", "order": "created_at"},
    "inspection-improvement-actions": {"table": "inspection_improvement_actions", "key": "inspection_improvement_actions", "order": "due_date"},
}


def serialise(value: Any) -> Any:
    if isinstance(value, (datetime.datetime, datetime.date, datetime.time)):
        return value.isoformat()
    if isinstance(value, decimal.Decimal):
        return float(value)
    return value


def rows_to_dicts(cursor, rows):
    columns = [col[0] for col in cursor.description or []]
    return [
        {columns[index]: serialise(value) for index, value in enumerate(row)}
        for row in rows
    ]


def table_exists(cursor, table_name: str) -> bool:
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
    return bool(cursor.fetchone()[0])


def get_columns(cursor, table_name: str) -> set[str]:
    cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = %s
        """,
        (table_name,),
    )
    return {row[0] for row in cursor.fetchall()}


def select_rows(
    *,
    table_name: str,
    young_person_id: int | None = None,
    home_id: int | None = None,
    provider_id: int | None = None,
    limit: int = 100,
    order_column: str | None = None,
):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not table_exists(cursor, table_name):
                return []

            columns = get_columns(cursor, table_name)

            where = []
            params = []

            def add_filter(column, value):
                if value is None or column not in columns:
                    return
                where.append(f'"{column}" = %s')
                params.append(value)

            add_filter("young_person_id", young_person_id)
            add_filter("home_id", home_id)
            add_filter("provider_id", provider_id)

            if "archived" in columns:
                where.append("(archived IS NULL OR archived = false)")

            sql = f'SELECT * FROM public."{table_name}"'

            if where:
                sql += " WHERE " + " AND ".join(where)

            if order_column and order_column in columns:
                sql += f' ORDER BY "{order_column}" DESC NULLS LAST'
            elif "created_at" in columns:
                sql += ' ORDER BY "created_at" DESC NULLS LAST'
            elif "id" in columns:
                sql += ' ORDER BY "id" DESC'

            sql += " LIMIT %s"
            params.append(max(1, min(int(limit or 100), 500)))

            cursor.execute(sql, tuple(params))
            rows = cursor.fetchall()
            return rows_to_dicts(cursor, rows)

    finally:
        if conn is not None:
            release_db_connection(conn)


def get_int(value):
    try:
        return int(value) if value not in (None, "") else None
    except Exception:
        return None


async def route_payload(
    route_key: str,
    request: Request,
    young_person_id: int | None = None,
    home_id: int | None = None,
    provider_id: int | None = None,
    limit: int = 100,
):
    config = ROUTE_TABLES[route_key]

    home_id = home_id or get_int(request.query_params.get("home_id"))
    provider_id = provider_id or get_int(request.query_params.get("provider_id"))

    try:
        rows = select_rows(
            table_name=config["table"],
            young_person_id=young_person_id,
            home_id=home_id,
            provider_id=provider_id,
            limit=limit,
            order_column=config.get("order"),
        )

        return {
            config["key"]: rows,
            "items": rows,
            "count": len(rows),
            "status": "ok",
            "route": route_key,
            "table": config["table"],
        }

    except Exception as error:
        return JSONResponse(
            status_code=200,
            content={
                config["key"]: [],
                "items": [],
                "count": 0,
                "status": "compat_error_softened",
                "route": route_key,
                "table": config["table"],
                "message": str(error),
            },
        )


def register_route(route_key: str):
    async def handler(
        request: Request,
        young_person_id: int | None = Query(default=None),
        home_id: int | None = Query(default=None),
        provider_id: int | None = Query(default=None),
        limit: int = Query(default=100),
    ):
        return await route_payload(
            route_key,
            request,
            young_person_id,
            home_id,
            provider_id,
            limit,
        )

    router.add_api_route(f"/{route_key}", handler, methods=["GET"])
    router.add_api_route(f"/api/{route_key}", handler, methods=["GET"])


for route_key in ROUTE_TABLES:
    register_route(route_key)


@router.get("/homes")
@router.get("/api/homes")
async def homes(request: Request, provider_id: int | None = Query(default=None)):
    return await route_payload("team", request, provider_id=provider_id, limit=1)


@router.get("/providers")
@router.get("/api/providers")
async def providers():
    rows = select_rows(table_name="providers", limit=100, order_column="name")
    return {"providers": rows, "items": rows, "count": len(rows), "status": "ok"}


@router.get("/assistant/scope-bundle")
@router.get("/api/assistant/scope-bundle")
@router.get("/assistant/os/scope-bundle")
@router.get("/api/assistant/os/scope-bundle")
async def assistant_scope_bundle(
    request: Request,
    young_person_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    provider_id: int | None = Query(default=None),
):
    bundle = {}
    sources = []

    for route_key, config in ROUTE_TABLES.items():
        rows = select_rows(
            table_name=config["table"],
            young_person_id=young_person_id,
            home_id=home_id,
            provider_id=provider_id,
            limit=25,
            order_column=config.get("order"),
        )
        bundle[config["key"]] = rows

        for row in rows[:5]:
            sources.append({
                "id": row.get("id"),
                "record_id": row.get("id"),
                "source_id": row.get("id"),
                "record_type": config["key"],
                "title": row.get("title") or row.get("name") or row.get("subject") or config["key"],
                "summary": row.get("summary") or row.get("description") or row.get("notes") or "",
                "date": row.get("created_at") or row.get("updated_at") or row.get("due_date"),
            })

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
        ],
        "runtime": {
            "source": "frontend_compat",
            "evidence_count": len(sources),
        },
    }


@router.post("/assistant/message")
@router.post("/api/assistant/message")
@router.post("/assistant/os/message")
@router.post("/api/assistant/os/message")
async def assistant_message():
    return {
        "answer": "The IndiCare assistant backend compatibility route is connected.",
        "sources": [],
        "suggested_actions": [],
        "runtime": {"source": "frontend_compat"},
    }
