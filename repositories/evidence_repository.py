from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import (
    build_scope_where,
    can_write_records,
    current_user_id,
    first_col,
    isoformat,
    normalise_priority,
    quote_ident,
    safe_int,
    table_columns,
    table_exists,
)


EVIDENCE_TABLES = [
    {
        "table": "inspection_evidence_facts",
        "source_type": "inspection_evidence_fact",
        "title": ["title", "fact_title", "evidence_title"],
        "description": ["description", "summary", "fact_text", "evidence_summary", "finding"],
        "quality": ["quality", "strength", "confidence"],
    },
    {
        "table": "os_inspection_evidence_notes",
        "source_type": "inspection_evidence_note",
        "title": ["evidence_title", "title"],
        "description": ["evidence_summary", "summary", "management_commentary"],
        "quality": ["strength", "quality"],
    },
    {
        "table": "os_evidence_links",
        "source_type": "record_evidence_link",
        "title": ["label", "evidence_type"],
        "description": ["label", "evidence_type"],
        "quality": ["strength", "quality"],
    },
    {
        "table": "reg44_report_evidence_items",
        "source_type": "reg44_evidence_item",
        "title": ["title", "evidence_title", "finding_title"],
        "description": ["summary", "evidence_summary", "description", "finding_text"],
        "quality": ["quality", "strength", "confidence"],
    },
    {
        "table": "record_standard_links",
        "source_type": "standard_link",
        "title": ["standard_key", "target_label", "relationship"],
        "description": ["notes", "relationship", "target_label"],
        "quality": ["quality", "strength"],
    },
]


def _first_value(row: dict[str, Any], candidates: list[str], default: Any = None) -> Any:
    for col in candidates:
        if row.get(col) not in (None, ""):
            return row.get(col)
    return default


def _normalise_quality(value: Any) -> str:
    quality = str(value or "").strip().lower().replace(" ", "_")
    if quality in {"strong", "adequate", "partial", "draft", "review_required"}:
        return quality
    if quality in {"weak", "gap"}:
        return "review_required"
    return "adequate"


def _normalise_evidence(row: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    raw_id = str(row.get("id") or row.get("record_id") or "")
    source_table = row.get("source_table") or row.get("record_table") or config["table"]
    source_id = row.get("source_id") or row.get("record_id") or row.get("chronology_event_id") or raw_id
    title = str(_first_value(row, config["title"], "Evidence item"))
    description = str(_first_value(row, config["description"], "Evidence available for review."))
    quality = _normalise_quality(_first_value(row, config["quality"], row.get("status")))

    return {
        "id": f"{config['source_type']}:{raw_id}",
        "source_type": str(source_table),
        "source_id": str(source_id) if source_id is not None else raw_id,
        "original_table": config["table"],
        "original_id": raw_id,
        "title": title,
        "description": description,
        "evidence_type": row.get("evidence_type") or config["source_type"],
        "young_person_id": str(row["young_person_id"]) if row.get("young_person_id") is not None else None,
        "home_id": str(row["home_id"]) if row.get("home_id") is not None else None,
        "linked_regulation": row.get("regulation") or row.get("regulation_ref") or row.get("sccif_area") or row.get("standard_key"),
        "linked_report_ids": row.get("linked_report_ids") or [],
        "created_by": str(row.get("created_by") or row.get("added_by") or "") or None,
        "created_at": isoformat(row.get("created_at") or row.get("added_at")) or "",
        "quality": quality,
        "tags": [
            item
            for item in [
                str(row.get("sccif_area") or ""),
                str(row.get("standard_key") or ""),
                str(config["source_type"]),
            ]
            if item
        ],
    }


def list_evidence(
    conn: Any,
    *,
    current_user: dict[str, Any],
    filters: dict[str, Any] | None = None,
    limit: int = 250,
) -> list[dict[str, Any]]:
    filters = filters or {}
    limit = max(1, min(int(limit or 250), 600))
    items: list[dict[str, Any]] = []

    for config in EVIDENCE_TABLES:
        table_name = config["table"]
        if not table_exists(conn, table_name):
            continue
        cols = table_columns(conn, table_name)
        select_cols = ["id"] if "id" in cols else []
        if not select_cols and "record_id" not in cols:
            continue
        for candidates in (config["title"], config["description"], config["quality"]):
            select_cols.extend([col for col in candidates if col in cols])
        select_cols.extend(
            [
                col
                for col in [
                    "evidence_type",
                    "source_table",
                    "source_id",
                    "record_table",
                    "record_id",
                    "chronology_event_id",
                    "home_id",
                    "provider_id",
                    "young_person_id",
                    "sccif_area",
                    "regulation",
                    "regulation_ref",
                    "standard_key",
                    "linked_report_ids",
                    "created_by",
                    "added_by",
                    "created_at",
                    "added_at",
                    "status",
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
        if filters.get("source_type") and "source_table" in cols:
            where.append("LOWER(COALESCE(source_table, '')) = %s")
            params.append(str(filters["source_type"]).lower())
        if filters.get("source_id") and "source_id" in cols:
            where.append("source_id = %s")
            params.append(filters["source_id"])
        if filters.get("regulation"):
            reg_col = first_col(cols, ["regulation", "regulation_ref", "sccif_area", "standard_key"])
            if reg_col:
                where.append(f"{quote_ident(reg_col)}::text ILIKE %s")
                params.append(f"%{filters['regulation']}%")

        order_col = first_col(cols, ["created_at", "added_at", "updated_at", "id"]) or select_cols[0]
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
        items.extend(_normalise_evidence(row, config) for row in rows)

    quality = str(filters.get("quality") or "").strip().lower()
    if quality:
        items = [item for item in items if item.get("quality") == quality]
    items.sort(key=lambda item: item.get("created_at") or "", reverse=True)
    return items[:limit]


def get_evidence(conn: Any, *, evidence_id: str, current_user: dict[str, Any]) -> dict[str, Any] | None:
    for item in list_evidence(conn, current_user=current_user, limit=600):
        if item["id"] == evidence_id or item["original_id"] == evidence_id:
            return item
    return None


def create_evidence_link(conn: Any, *, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
    if not can_write_records(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to attach evidence.")
    if not table_exists(conn, "os_evidence_links"):
        raise HTTPException(status_code=400, detail="Evidence link storage is not available in this schema.")

    source_table = str(payload.get("source_table") or payload.get("source_type") or payload.get("record_type") or "").strip()
    source_id = safe_int(payload.get("source_id") or payload.get("record_id"))
    if not source_table or source_id is None:
        raise HTTPException(status_code=400, detail="A numeric source_id and source_table are required to attach evidence.")

    cols = table_columns(conn, "os_evidence_links")
    metadata = {
        **(payload.get("metadata") or {}),
        "record_type": payload.get("record_type"),
        "record_id": payload.get("record_id"),
        "evidence_id": payload.get("evidence_id"),
        "quality": payload.get("quality"),
        "confidence": payload.get("confidence"),
        "source": payload.get("source"),
        "duplicate_key": f"{source_table}:{source_id}:{payload.get('evidence_type') or 'record'}",
    }
    insert: dict[str, Any] = {}
    for column, value in {
        "provider_id": safe_int(payload.get("provider_id")),
        "home_id": safe_int(payload.get("home_id")),
        "young_person_id": safe_int(payload.get("young_person_id")),
        "evidence_type": payload.get("evidence_type") or "record",
        "source_table": source_table,
        "source_id": source_id,
        "label": payload.get("label") or payload.get("title") or "Evidence attached",
        "sccif_area": payload.get("sccif_area"),
        "regulation_refs": payload.get("regulation_refs") or payload.get("regulation_references") or [],
        "added_by": current_user_id(current_user),
        "added_at": datetime.now(timezone.utc),
        "metadata": metadata,
    }.items():
        if column in cols and value is not None:
            insert[column] = value

    columns = list(insert)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT *
            FROM public.os_evidence_links
            WHERE source_table = %s AND source_id = %s AND evidence_type = %s
            LIMIT 1
            """,
            (source_table, source_id, insert.get("evidence_type", "record")),
        )
        existing = cur.fetchone()
        if existing:
            return _normalise_evidence(dict(existing), EVIDENCE_TABLES[2])
        cur.execute(
            f"""
            INSERT INTO public.os_evidence_links ({", ".join(quote_ident(col) for col in columns)})
            VALUES ({", ".join(["%s"] * len(columns))})
            RETURNING *
            """,
            tuple(Json(insert[col]) if col == "metadata" else insert[col] for col in columns),
        )
        row = cur.fetchone()
    return _normalise_evidence(dict(row), EVIDENCE_TABLES[2])


def build_coverage(evidence: list[dict[str, Any]], actions: list[dict[str, Any]]) -> dict[str, Any]:
    areas = {
        "experiences_and_progress": {"label": "Children's experiences and progress", "evidence": 0, "actions": 0},
        "helped_and_protected": {"label": "Children are helped and protected", "evidence": 0, "actions": 0},
        "leadership_management": {"label": "Leadership and management", "evidence": 0, "actions": 0},
    }
    for item in evidence:
        for key in areas:
            if key in " ".join(item.get("tags") or []) or key in str(item.get("linked_regulation") or ""):
                areas[key]["evidence"] += 1
    for action in actions:
        reg = str(action.get("regulation") or "")
        for key in areas:
            if key in reg:
                areas[key]["actions"] += 1
    return {
        "areas": [
            {
                "key": key,
                **value,
                "status": "evidenced" if value["evidence"] else "gap",
                "priority": normalise_priority("high" if value["actions"] and not value["evidence"] else "medium"),
            }
            for key, value in areas.items()
        ]
    }

