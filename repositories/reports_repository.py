from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from psycopg2.extras import RealDictCursor

from repositories.os_repository_utils import (
    build_scope_where,
    can_write_records,
    current_user_id,
    first_col,
    isoformat,
    quote_ident,
    safe_int,
    table_columns,
    table_exists,
)


REPORT_TABLES = [
    {"table": "ai_generated_reports", "source_type": "ai_generated_report"},
    {"table": "reports", "source_type": "report"},
    {"table": "ofsted_reports", "source_type": "ofsted_report"},
    {"table": "reg45_reports", "source_type": "reg45_report"},
]

TITLE_COLUMNS = ["title", "report_title", "name"]
TYPE_COLUMNS = ["report_type", "type", "template_id", "category"]
BODY_COLUMNS = ["report_text", "content", "draft_text", "body", "summary"]


def _first(row: dict[str, Any], keys: list[str], default: Any = None) -> Any:
    for key in keys:
        if row.get(key) not in (None, ""):
            return row.get(key)
    return default


def _normalise_report(row: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    raw_id = str(row.get("id") or "")
    report_type = str(_first(row, TYPE_COLUMNS, config["source_type"]))
    return {
        "id": f"{config['source_type']}:{raw_id}",
        "source_type": config["source_type"],
        "source_id": raw_id,
        "original_table": config["table"],
        "original_id": raw_id,
        "title": str(_first(row, TITLE_COLUMNS, "Report draft")),
        "type": report_type,
        "status": str(row.get("status") or row.get("workflow_status") or "draft"),
        "young_person_id": str(row["young_person_id"]) if row.get("young_person_id") is not None else None,
        "home_id": str(row["home_id"]) if row.get("home_id") is not None else None,
        "date_range_start": isoformat(row.get("date_range_start") or row.get("period_start") or row.get("date_from")),
        "date_range_end": isoformat(row.get("date_range_end") or row.get("period_end") or row.get("date_to")),
        "generated_by": str(row.get("generated_by") or row.get("created_by") or "") or None,
        "created_at": isoformat(row.get("created_at") or row.get("generated_at")) or "",
        "updated_at": isoformat(row.get("updated_at") or row.get("generated_at")) or "",
        "body": _first(row, BODY_COLUMNS, ""),
        "citations": row.get("citations") or row.get("source_citations") or [],
        "metadata": row.get("metadata") or {},
    }


def list_reports(
    conn: Any,
    *,
    current_user: dict[str, Any],
    filters: dict[str, Any] | None = None,
    limit: int = 250,
) -> list[dict[str, Any]]:
    filters = filters or {}
    limit = max(1, min(int(limit or 250), 600))
    reports: list[dict[str, Any]] = []

    for config in REPORT_TABLES:
        table_name = config["table"]
        if not table_exists(conn, table_name):
            continue
        cols = table_columns(conn, table_name)
        if "id" not in cols:
            continue
        select_cols = ["id"]
        for candidates in (TITLE_COLUMNS, TYPE_COLUMNS, BODY_COLUMNS):
            select_cols.extend([col for col in candidates if col in cols])
        select_cols.extend(
            [
                col
                for col in [
                    "status",
                    "workflow_status",
                    "young_person_id",
                    "home_id",
                    "provider_id",
                    "date_range_start",
                    "date_range_end",
                    "period_start",
                    "period_end",
                    "date_from",
                    "date_to",
                    "generated_by",
                    "created_by",
                    "created_at",
                    "updated_at",
                    "generated_at",
                    "citations",
                    "source_citations",
                    "metadata",
                ]
                if col in cols
            ]
        )
        select_cols = sorted(set(select_cols), key=select_cols.index)
        where, params = build_scope_where(
            cols,
            current_user,
            home_id=filters.get("home_id"),
            young_person_id=filters.get("young_person_id"),
        )
        if filters.get("report_type"):
            type_col = first_col(cols, TYPE_COLUMNS)
            if type_col:
                where.append(f"{quote_ident(type_col)}::text ILIKE %s")
                params.append(f"%{filters['report_type']}%")
        order_col = first_col(cols, ["updated_at", "generated_at", "created_at", "id"]) or "id"
        params.append(limit)
        where_sql = "WHERE " + " AND ".join(where) if where else ""
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT {", ".join(quote_ident(col) for col in select_cols)}
                FROM public.{quote_ident(table_name)}
                {where_sql}
                ORDER BY {quote_ident(order_col)} DESC NULLS LAST
                LIMIT %s
                """,
                tuple(params),
            )
            rows = [dict(row) for row in (cur.fetchall() or [])]
        reports.extend(_normalise_report(row, config) for row in rows)

    reports.sort(key=lambda item: item.get("updated_at") or item.get("created_at") or "", reverse=True)
    return reports[:limit]


def get_report(conn: Any, *, report_id: str, current_user: dict[str, Any]) -> dict[str, Any] | None:
    for report in list_reports(conn, current_user=current_user, limit=600):
        if report["id"] == report_id or report["original_id"] == report_id:
            return report
    return None


def generate_report_draft(*, payload: dict[str, Any], chronology_items: list[dict[str, Any]], evidence: list[dict[str, Any]]) -> dict[str, Any]:
    report_type = str(payload.get("report_type") or payload.get("type") or "care_review")
    title = str(payload.get("title") or f"{report_type.replace('_', ' ').title()} draft")
    citations = [
        {
            "label": item.get("citation_label"),
            "source_url": item.get("source_url"),
            "date_time": item.get("date_time"),
            "excerpt": item.get("summary"),
        }
        for item in chronology_items[:20]
    ]
    evidence_gaps = []
    if not chronology_items:
        evidence_gaps.append("No chronology records were found for the selected scope.")
    if not evidence:
        evidence_gaps.append("No linked evidence records were found for the selected scope.")

    gap_lines = [f"- {gap}" for gap in evidence_gaps] if evidence_gaps else ["- No evidence gaps identified from available records."]
    body = "\n\n".join(
        [
            "Draft for review.",
            "Evidence base",
            *[f"- {item.get('title')}: {item.get('summary')}" for item in chronology_items[:10]],
            "Evidence gaps",
            *gap_lines,
        ]
    )
    return {
        "id": "draft",
        "title": title,
        "type": report_type,
        "status": "draft",
        "body": body,
        "citations": citations,
        "evidence_gaps": evidence_gaps,
        "review_required": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def save_report_draft(conn: Any, *, report_id: str, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
    if not can_write_records(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to save reports.")
    if not table_exists(conn, "ai_generated_reports"):
        raise HTTPException(status_code=400, detail="Report draft storage is not available in this schema.")
    cols = table_columns(conn, "ai_generated_reports")
    insert: dict[str, Any] = {}
    for column, value in {
        "title": payload.get("title") or "Report draft",
        "report_title": payload.get("title") or "Report draft",
        "report_type": payload.get("type") or payload.get("report_type"),
        "status": payload.get("status") or "draft",
        "report_text": payload.get("body") or payload.get("report_text"),
        "content": payload.get("body") or payload.get("content"),
        "home_id": safe_int(payload.get("home_id")),
        "young_person_id": safe_int(payload.get("young_person_id")),
        "generated_by": current_user_id(current_user),
        "created_by": current_user_id(current_user),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "generated_at": datetime.now(timezone.utc),
        "metadata": payload.get("metadata") or {"saved_from": report_id},
    }.items():
        if column in cols and value is not None:
            insert[column] = value
    if not insert:
        raise HTTPException(status_code=400, detail="No compatible report fields are available.")
    columns = list(insert)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            INSERT INTO public.ai_generated_reports ({", ".join(quote_ident(col) for col in columns)})
            VALUES ({", ".join(["%s"] * len(columns))})
            RETURNING *
            """,
            tuple(insert[col] for col in columns),
        )
        row = cur.fetchone()
    return _normalise_report(dict(row), {"table": "ai_generated_reports", "source_type": "ai_generated_report"})

