from __future__ import annotations

import datetime
import decimal
import json
from typing import Any

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from db.connection import get_db_connection

router = APIRouter(tags=["frontend-compat"])


ROUTE_TABLES: dict[str, dict[str, Any]] = {
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
        "order": "concern_datetime",
    },
    "support-plans": {
        "table": "support_plans",
        "key": "support_plans",
        "order": "review_date",
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
    "reports": {
        "table": "ai_generated_reports",
        "key": "reports",
        "order": "created_at",
    },
    "homes": {
        "table": "homes",
        "key": "homes",
        "order": "name",
    },
    "providers": {
        "table": "providers",
        "key": "providers",
        "order": "name",
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
        "table": "supervision_sessions",
        "key": "supervisions",
        "order": "scheduled_date",
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
    "quality-audits": {
        "table": "quality_audits",
        "key": "quality_audits",
        "order": "audit_date",
    },
    "inspection-scores": {
        "table": "inspection_scores",
        "key": "inspection_scores",
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
    "inspection-reasons": {
        "table": "inspection_score_reasons",
        "key": "inspection_reasons",
        "order": "created_at",
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


def rows_to_dicts(rows: list[Any]) -> list[dict[str, Any]]:
    return [{key: serialise(value) for key, value in dict(row).items()} for row in rows]


async def table_exists(conn: Any, table_name: str) -> bool:
    return bool(
        await conn.fetchval(
            """
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.tables
              WHERE table_schema = 'public'
              AND table_name = $1
            )
            """,
            table_name,
        )
    )


async def get_columns(conn: Any, table_name: str) -> set[str]:
    rows = await conn.fetch(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        """,
        table_name,
    )
    return {row["column_name"] for row in rows}


def parse_allowed_home_ids(value: Any) -> list[int]:
    if value is None:
        return []

    if isinstance(value, list):
        raw = value
    else:
        try:
            raw = json.loads(str(value))
        except Exception:
            raw = str(value).split(",")

    ids: list[int] = []

    if isinstance(raw, list):
        iterable = raw
    else:
        iterable = str(raw).split(",")

    for item in iterable:
        try:
            num = int(str(item).strip())
            if num > 0:
                ids.append(num)
        except Exception:
            pass

    return sorted(set(ids))


async def get_auth_context(request: Request) -> dict[str, Any]:
    dataset_provider_id = request.query_params.get("provider_id")
    dataset_home_id = request.query_params.get("home_id")

    current_user = getattr(request.state, "user", None) or {}
    if not isinstance(current_user, dict):
        current_user = {}

    provider_id = (
        current_user.get("provider_id")
        or current_user.get("providerId")
        or dataset_provider_id
    )

    home_id = (
        current_user.get("home_id")
        or current_user.get("homeId")
        or dataset_home_id
    )

    allowed_home_ids = (
        current_user.get("allowed_home_ids")
        or current_user.get("allowedHomeIds")
        or current_user.get("home_ids")
        or current_user.get("homeIds")
        or request.query_params.get("allowed_home_ids")
        or []
    )

    try:
        provider_id = int(provider_id) if provider_id else None
    except Exception:
        provider_id = None

    try:
        home_id = int(home_id) if home_id else None
    except Exception:
        home_id = None

    return {
        "user": current_user,
        "provider_id": provider_id,
        "home_id": home_id,
        "allowed_home_ids": parse_allowed_home_ids(allowed_home_ids),
    }


async def select_rows(
    conn: Any,
    *,
    table_name: str,
    young_person_id: int | None = None,
    home_id: int | None = None,
    provider_id: int | None = None,
    limit: int = 100,
    order_column: str | None = None,
) -> list[dict[str, Any]]:
    if table_name not in {config["table"] for config in ROUTE_TABLES.values()}:
        raise ValueError(f"Unsupported table: {table_name}")

    if not await table_exists(conn, table_name):
        return []

    columns = await get_columns(conn, table_name)

    where: list[str] = []
    args: list[Any] = []

    def add_filter(column: str, value: Any) -> None:
        if value is None or column not in columns:
            return
        args.append(value)
        where.append(f'"{column}" = ${len(args)}')

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

    args.append(max(1, min(int(limit or 100), 500)))
    sql += f" LIMIT ${len(args)}"

    rows = await conn.fetch(sql, *args)
    return rows_to_dicts(rows)


async def fetch_route_payload(
    request: Request,
    route_key: str,
    young_person_id: int | None,
    home_id: int | None,
    provider_id: int | None,
    limit: int,
) -> dict[str, Any]:
    config = ROUTE_TABLES[route_key]
    auth = await get_auth_context(request)

    final_home_id = home_id or auth["home_id"]
    final_provider_id = provider_id or auth["provider_id"]

    async with get_db_connection() as conn:
        rows = await select_rows(
            conn,
            table_name=config["table"],
            young_person_id=young_person_id,
            home_id=final_home_id,
            provider_id=final_provider_id,
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
        "filters": {
            "young_person_id": young_person_id,
            "home_id": final_home_id,
            "provider_id": final_provider_id,
        },
    }


async def generic_get_handler(
    request: Request,
    route_key: str,
    young_person_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    provider_id: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    try:
        return await fetch_route_payload(
            request,
            route_key,
            young_person_id,
            home_id,
            provider_id,
            limit,
        )
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "route": route_key,
                "message": str(error),
                "items": [],
                ROUTE_TABLES.get(route_key, {}).get("key", "items"): [],
            },
        )


def register_get_aliases(route_key: str) -> None:
    async def handler(
        request: Request,
        young_person_id: int | None = Query(default=None),
        home_id: int | None = Query(default=None),
        provider_id: int | None = Query(default=None),
        limit: int = Query(default=100, ge=1, le=500),
    ):
        return await generic_get_handler(
            request=request,
            route_key=route_key,
            young_person_id=young_person_id,
            home_id=home_id,
            provider_id=provider_id,
            limit=limit,
        )

    router.add_api_route(
        f"/{route_key}",
        handler,
        methods=["GET"],
        name=f"compat_{route_key.replace('-', '_')}",
    )
    router.add_api_route(
        f"/api/{route_key}",
        handler,
        methods=["GET"],
        name=f"compat_api_{route_key.replace('-', '_')}",
    )


for key in ROUTE_TABLES:
    register_get_aliases(key)


@router.get("/me")
@router.get("/api/me")
async def compat_me(request: Request):
    auth = await get_auth_context(request)
    return {
        "authenticated": True,
        "user": auth["user"],
        "provider_id": auth["provider_id"],
        "home_id": auth["home_id"],
        "allowed_home_ids": auth["allowed_home_ids"],
    }


@router.get("/api/auth/check")
async def compat_api_auth_check(request: Request):
    auth = await get_auth_context(request)
    return {
        "authenticated": True,
        "provider_id": auth["provider_id"],
        "home_id": auth["home_id"],
        "allowed_home_ids": auth["allowed_home_ids"],
        "user": auth["user"],
    }


async def build_scope_bundle(
    request: Request,
    young_person_id: int | None,
    home_id: int | None,
    provider_id: int | None,
) -> dict[str, Any]:
    auth = await get_auth_context(request)
    final_home_id = home_id or auth["home_id"]
    final_provider_id = provider_id or auth["provider_id"]

    bundle_keys = [
        "appointments",
        "daily-notes",
        "communications",
        "incidents",
        "safeguarding",
        "support-plans",
        "tasks",
        "documents",
        "compliance-items",
        "quality-audits",
        "inspection-scores",
        "inspection-improvement-actions",
    ]

    bundle: dict[str, Any] = {}
    sources: list[dict[str, Any]] = []

    async with get_db_connection() as conn:
        for key in bundle_keys:
            config = ROUTE_TABLES[key]
            rows = await select_rows(
                conn,
                table_name=config["table"],
                young_person_id=young_person_id,
                home_id=final_home_id,
                provider_id=final_provider_id,
                limit=50,
                order_column=config.get("order"),
            )
            bundle[config["key"]] = rows

            for row in rows[:10]:
                sources.append(
                    {
                        "id": row.get("id"),
                        "source_id": row.get("id"),
                        "record_id": row.get("id"),
                        "record_type": config["key"],
                        "title": row.get("title")
                        or row.get("task")
                        or row.get("audit_title")
                        or row.get("action_title")
                        or row.get("document_type")
                        or config["key"],
                        "summary": row.get("summary")
                        or row.get("description")
                        or row.get("concern_details")
                        or row.get("generated_text")
                        or row.get("input_text")
                        or "",
                        "date": row.get("created_at")
                        or row.get("updated_at")
                        or row.get("due_date")
                        or row.get("review_date"),
                    }
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
            "home_id": final_home_id,
            "provider_id": final_provider_id,
            "young_person_id": young_person_id,
        },
    }


@router.get("/assistant/scope-bundle")
@router.get("/api/assistant/scope-bundle")
@router.get("/assistant/os/scope-bundle")
@router.get("/api/assistant/os/scope-bundle")
async def compat_scope_bundle_get(
    request: Request,
    young_person_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    provider_id: int | None = Query(default=None),
):
    return await build_scope_bundle(request, young_person_id, home_id, provider_id)


@router.post("/assistant/scope-bundle")
@router.post("/api/assistant/scope-bundle")
@router.post("/assistant/os/scope-bundle")
@router.post("/api/assistant/os/scope-bundle")
async def compat_scope_bundle_post(request: Request):
    body: dict[str, Any] = {}
    try:
        parsed = await request.json()
        if isinstance(parsed, dict):
            body = parsed
    except Exception:
        body = {}

    context = body.get("context") if isinstance(body.get("context"), dict) else body

    return await build_scope_bundle(
        request,
        young_person_id=context.get("young_person_id"),
        home_id=context.get("home_id"),
        provider_id=context.get("provider_id"),
    )


@router.post("/assistant/message")
@router.post("/api/assistant/message")
@router.post("/assistant/os/message")
@router.post("/api/assistant/os/message")
async def compat_assistant_message(request: Request):
    try:
        parsed = await request.json()
        body = parsed if isinstance(parsed, dict) else {}
    except Exception:
        body = {}

    message = str(body.get("message") or "").strip()
    context = body.get("context") if isinstance(body.get("context"), dict) else {}

    bundle = await build_scope_bundle(
        request,
        young_person_id=context.get("young_person_id"),
        home_id=context.get("home_id"),
        provider_id=context.get("provider_id"),
    )

    evidence_count = bundle.get("runtime", {}).get("evidence_count", 0)

    return {
        "answer": (
            "I have connected to the IndiCare backend compatibility route. "
            f"I can see {evidence_count} evidence item(s) in the current scope. "
            "The full streamed AI answer engine can now be attached to this endpoint."
        ),
        "message": message,
        "sources": bundle.get("sources", []),
        "suggested_actions": bundle.get("suggested_actions", []),
        "runtime": {
            **bundle.get("runtime", {}),
            "source": "frontend_compat_message",
        },
        "explainability": {
            "reasoning_summary": "This response used the current backend scope bundle route.",
        },
    }
