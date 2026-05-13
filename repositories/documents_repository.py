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


DOCUMENT_TABLES = [
    {"table": "statutory_documents", "source_type": "statutory_document"},
    {"table": "documents", "source_type": "document"},
    {"table": "child_documents", "source_type": "child_document"},
    {"table": "document_intelligence_jobs", "source_type": "document_intelligence_job"},
    {"table": "reg44_report_imports", "source_type": "reg44_import"},
]

TITLE_COLUMNS = ["title", "document_title", "filename", "file_name", "original_filename", "report_title"]
TYPE_COLUMNS = ["document_type", "category", "type", "route_type", "report_type"]
TEXT_COLUMNS = ["extracted_text", "content", "description", "summary", "raw_text", "report_text"]


def _first(row: dict[str, Any], keys: list[str], default: Any = None) -> Any:
    for key in keys:
        if row.get(key) not in (None, ""):
            return row.get(key)
    return default


def _normalise_document(row: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    raw_id = str(row.get("id") or "")
    document_type = str(_first(row, TYPE_COLUMNS, config["source_type"]))
    status = str(row.get("status") or row.get("workflow_status") or "uploaded")
    extracted_text = _first(row, TEXT_COLUMNS, "")
    return {
        "id": f"{config['source_type']}:{raw_id}",
        "source_type": config["source_type"],
        "source_id": raw_id,
        "original_table": config["table"],
        "original_id": raw_id,
        "title": str(_first(row, TITLE_COLUMNS, "Document")),
        "document_type": document_type,
        "category": document_type,
        "status": status,
        "young_person_id": str(row["young_person_id"]) if row.get("young_person_id") is not None else None,
        "home_id": str(row["home_id"]) if row.get("home_id") is not None else None,
        "uploaded_by": str(row.get("uploaded_by") or row.get("created_by") or row.get("user_id") or "") or None,
        "uploaded_at": isoformat(row.get("uploaded_at") or row.get("created_at") or row.get("imported_at")) or "",
        "review_required_by": isoformat(row.get("review_date") or row.get("review_required_by") or row.get("expires_at")),
        "file_url": row.get("file_url") or row.get("url") or row.get("storage_url"),
        "extracted_text": extracted_text,
        "regulation": row.get("regulation") or row.get("regulation_ref") or ("Regulation 44" if "reg44" in document_type else None),
        "period_start": isoformat(row.get("period_start") or row.get("date_from")),
        "period_end": isoformat(row.get("period_end") or row.get("date_to")),
        "tags": row.get("tags") or [document_type],
        "linked_actions": row.get("linked_actions") or [],
        "linked_evidence": row.get("linked_evidence") or [],
        "metadata": row.get("metadata") or {},
    }


def list_documents(
    conn: Any,
    *,
    current_user: dict[str, Any],
    filters: dict[str, Any] | None = None,
    limit: int = 250,
) -> list[dict[str, Any]]:
    filters = filters or {}
    limit = max(1, min(int(limit or 250), 600))
    documents: list[dict[str, Any]] = []

    for config in DOCUMENT_TABLES:
        table_name = config["table"]
        if not table_exists(conn, table_name):
            continue
        cols = table_columns(conn, table_name)
        if "id" not in cols:
            continue
        select_cols = ["id"]
        for candidates in (TITLE_COLUMNS, TYPE_COLUMNS, TEXT_COLUMNS):
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
                    "uploaded_by",
                    "created_by",
                    "user_id",
                    "uploaded_at",
                    "created_at",
                    "imported_at",
                    "review_date",
                    "review_required_by",
                    "expires_at",
                    "file_url",
                    "url",
                    "storage_url",
                    "regulation",
                    "regulation_ref",
                    "period_start",
                    "period_end",
                    "date_from",
                    "date_to",
                    "tags",
                    "linked_actions",
                    "linked_evidence",
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
        if filters.get("document_type"):
            type_col = first_col(cols, TYPE_COLUMNS)
            if type_col:
                where.append(f"{quote_ident(type_col)}::text ILIKE %s")
                params.append(f"%{filters['document_type']}%")
        order_col = first_col(cols, ["uploaded_at", "imported_at", "created_at", "updated_at", "id"]) or "id"
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
        documents.extend(_normalise_document(row, config) for row in rows)

    documents.sort(key=lambda item: item.get("uploaded_at") or "", reverse=True)
    return documents[:limit]


def get_document(conn: Any, *, document_id: str, current_user: dict[str, Any]) -> dict[str, Any] | None:
    for document in list_documents(conn, current_user=current_user, limit=600):
        if document["id"] == document_id or document["original_id"] == document_id:
            return document
    return None


def create_reg44_metadata(conn: Any, *, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
    if not can_write_records(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to upload documents.")
    table_name = "reg44_report_imports" if table_exists(conn, "reg44_report_imports") else None
    if table_name is None:
        raise HTTPException(status_code=400, detail="Reg 44 import storage is not available in this schema.")

    cols = table_columns(conn, table_name)
    insert: dict[str, Any] = {}
    for column, value in {
        "title": payload.get("title") or "Reg 44 report",
        "report_title": payload.get("title") or "Reg 44 report",
        "home_id": safe_int(payload.get("home_id")),
        "status": "uploaded",
        "raw_text": payload.get("text") or payload.get("extracted_text"),
        "extracted_text": payload.get("text") or payload.get("extracted_text"),
        "created_by": current_user_id(current_user),
        "imported_by": current_user_id(current_user),
        "created_at": datetime.now(timezone.utc),
        "imported_at": datetime.now(timezone.utc),
        "metadata": payload.get("metadata") or {},
    }.items():
        if column in cols and value is not None:
            insert[column] = value
    if not insert:
        raise HTTPException(status_code=400, detail="No compatible Reg 44 import fields are available.")

    columns = list(insert)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            INSERT INTO public.{quote_ident(table_name)} ({", ".join(quote_ident(col) for col in columns)})
            VALUES ({", ".join(["%s"] * len(columns))})
            RETURNING *
            """,
            tuple(insert[col] for col in columns),
        )
        row = cur.fetchone()
    return _normalise_document(dict(row), {"table": table_name, "source_type": "reg44_import"})

