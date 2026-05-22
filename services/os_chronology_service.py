from __future__ import annotations

import logging
import time
from typing import Any

from db.connection import get_db_connection, release_db_connection
from repositories.os_repository_utils import (
    array_text,
    build_scope_where,
    first_col,
    isoformat,
    json_expr,
    normalise_severity,
    quote_ident,
    table_columns,
    table_exists,
    text_expr,
    timestamptz_expr,
)


logger = logging.getLogger(__name__)

CHRONOLOGY_PRIORITY_TYPES = {"chronology", "os_chronology"}

SOURCE_TABLES: list[dict[str, Any]] = [
    {"table": "daily_notes", "source_type": "daily_log", "category": "Daily recording", "sccif": "experiences_and_progress"},
    {"table": "safeguarding_records", "source_type": "safeguarding", "category": "Safeguarding", "severity": "high", "sccif": "helped_and_protected"},
    {"table": "risk_assessments", "source_type": "risk_assessment", "category": "Risk", "sccif": "helped_and_protected"},
    {"table": "risk_reviews", "source_type": "risk_review", "category": "Risk review", "sccif": "helped_and_protected"},
    {"table": "monthly_reviews", "source_type": "monthly_review", "category": "Review", "sccif": "experiences_and_progress"},
    {"table": "manager_actions", "source_type": "manager_review", "category": "Management oversight", "sccif": "leadership_management"},
    {"table": "incidents", "source_type": "incident", "category": "Incident", "sccif": "helped_and_protected"},
    {"table": "medication_records", "source_type": "medication", "category": "Health and medication", "sccif": "experiences_and_progress"},
    {"table": "health_records", "source_type": "health", "category": "Health", "sccif": "experiences_and_progress"},
    {"table": "education_records", "source_type": "education", "category": "Education", "sccif": "experiences_and_progress"},
    {"table": "keywork_sessions", "source_type": "keywork", "category": "Keywork and direct work", "sccif": "experiences_and_progress"},
    {"table": "appointments", "source_type": "appointment", "category": "Appointment", "sccif": "experiences_and_progress"},
    {"table": "statutory_documents", "source_type": "document", "category": "Statutory document", "sccif": "leadership_management"},
    {"table": "inspection_evidence_facts", "source_type": "evidence", "category": "Inspection evidence", "sccif": "leadership_management"},
    {"table": "inspection_improvement_actions", "source_type": "inspection_action", "category": "Inspection action", "sccif": "leadership_management"},
    {"table": "ai_generated_reports", "source_type": "report", "category": "Report", "sccif": "leadership_management"},
    {"table": "record_workflow_events", "source_type": "workflow_event", "category": "Lifecycle workflow", "sccif": "leadership_management"},
    {"table": "record_ai_reviews", "source_type": "ai_review", "category": "AI review", "sccif": "leadership_management"},
    {"table": "os_young_person_care_records", "source_type": "care_record", "category": "Care recording", "sccif": "experiences_and_progress"},
    {"table": "chronology_events", "source_type": "chronology", "category": "Chronology", "sccif": None},
    {"table": "os_chronology_events", "source_type": "os_chronology", "category": "OS chronology", "sccif": None},
]

PRIORITY_CHRONOLOGY_SOURCES = [
    source for source in SOURCE_TABLES if source["source_type"] in CHRONOLOGY_PRIORITY_TYPES
]
SUPPLEMENTAL_CHRONOLOGY_SOURCES = [
    source for source in SOURCE_TABLES if source["source_type"] not in CHRONOLOGY_PRIORITY_TYPES
]


DATE_COLUMNS = [
    "event_at",
    "event_datetime",
    "occurred_at",
    "incident_datetime",
    "appointment_datetime",
    "date_time",
    "recorded_at",
    "note_date",
    "record_date",
    "review_date",
    "created_at",
    "updated_at",
]

TITLE_COLUMNS = [
    "event_title",
    "title",
    "document_title",
    "report_title",
    "action_title",
    "evidence_title",
    "concern_type",
    "incident_type",
    "category",
    "record_type",
    "type",
]

SUMMARY_COLUMNS = [
    "event_summary",
    "summary",
    "narrative",
    "description",
    "concern_summary",
    "presentation",
    "outcome",
    "action_description",
    "evidence_summary",
    "findings",
    "extracted_text",
    "report_text",
    "content",
    "manager_comment",
    "manager_review_comment",
]


def _source_url(source_type: str, source_id: str, young_person_id: str | None) -> str:
    if source_type in {"daily_log", "care_record"}:
        return f"/daily-logs/{source_id}"
    if source_type == "incident":
        return f"/incidents/{source_id}"
    if source_type == "safeguarding":
        return f"/safeguarding/{source_id}"
    if source_type in {"risk_assessment", "risk_review"}:
        return f"/risk-assessments/{source_id}"
    if source_type == "medication":
        return f"/medication/{source_id}"
    if source_type == "health":
        return f"/health/{source_id}"
    if source_type == "education":
        return f"/young-people/{young_person_id}/workspace#education" if young_person_id else "/young-people"
    if source_type == "keywork":
        return f"/keywork/{source_id}"
    if source_type == "appointment":
        return f"/appointments/{source_id}"
    if source_type == "document":
        return f"/documents/{source_id}"
    if source_type == "report":
        return f"/reports/{source_id}"
    if source_type in {"manager_review", "inspection_action"}:
        return f"/actions/{source_id}"
    if source_type == "evidence":
        return f"/evidence/{source_id}"
    return f"/chronology/{source_type}:{source_id}"


def _tags_for(row: dict[str, Any], source: dict[str, Any]) -> list[str]:
    tags = set(array_text(row.get("tags")))
    source_type = source["source_type"]
    tags.add(source_type)
    status = str(row.get("status") or row.get("workflow_status") or "").lower()
    if "review" in status or row.get("manager_review_required") is True:
        tags.add("manager-review")
    if source_type in {"safeguarding", "risk_assessment", "risk_review", "incident"}:
        tags.add("safeguarding" if source_type == "safeguarding" else "risk")
    return sorted(tags)


def _normalise_row(row: dict[str, Any], source: dict[str, Any]) -> dict[str, Any]:
    source_type = source["source_type"]
    source_table = str(row.get("source_table") or source["table"])
    source_id = str(row.get("source_id") or row.get("id") or "")
    young_person_ids = [str(row["young_person_id"])] if row.get("young_person_id") is not None else []
    staff_id = row.get("staff_id") or row.get("author_id") or row.get("created_by") or row.get("owner_id")
    staff_ids = [str(staff_id)] if staff_id is not None else []
    date_time = isoformat(row.get("date_time") or row.get("created_at")) or ""
    title = str(row.get("title") or source["category"])
    summary = str(row.get("summary") or row.get("full_text") or "Record available for review.")
    category = str(row.get("category") or source["category"])
    metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
    sccif = row.get("sccif_area") or source.get("sccif")
    severity = normalise_severity(row.get("severity") or source.get("severity") or metadata.get("severity"))
    tags = _tags_for(row, source)

    regulation_refs = array_text(row.get("regulation_refs") or metadata.get("regulation_refs"))
    regulation_links = [
        {"regulation": ref, "label": ref, "confidence": "direct"}
        for ref in regulation_refs
    ]

    evidence_ids = array_text(row.get("evidence_ids") or metadata.get("evidence_ids"))
    action_ids = array_text(row.get("action_ids") or metadata.get("action_ids"))
    document_ids = array_text(row.get("document_ids") or metadata.get("document_ids"))
    report_ids = array_text(row.get("report_ids") or metadata.get("report_ids"))
    event_id = f"{source_type}:{source_id}"
    home_id = str(row["home_id"]) if row.get("home_id") is not None else None
    created_by = row.get("created_by") or row.get("author_id")

    return {
        "id": event_id,
        "source_type": source_type,
        "source_id": source_id,
        "source_table": source_table,
        "canonical_source_key": f"{source_table}:{source_id}" if source_id else None,
        "date_time": date_time,
        "title": title,
        "summary": summary,
        "full_text": row.get("full_text") or summary,
        "young_person_ids": young_person_ids,
        "staff_ids": staff_ids,
        "home_id": home_id,
        "category": category,
        "severity": severity,
        "tags": tags,
        "safeguarding_flags": ["safeguarding"] if "safeguarding" in tags else [],
        "risk_flags": ["risk"] if "risk" in tags else [],
        "regulation_links": regulation_links,
        "sccif_links": [str(sccif)] if sccif else [],
        "quality_standard_links": array_text(row.get("quality_standard_links") or metadata.get("quality_standard_links")),
        "evidence_ids": evidence_ids,
        "action_ids": action_ids,
        "document_ids": document_ids,
        "report_ids": report_ids,
        "created_by": str(created_by) if created_by is not None else None,
        "citation_label": f"{source['category']} #{source_id}",
        "source_url": _source_url(source_type, source_id, young_person_ids[0] if young_person_ids else None),
        "metadata": metadata,
    }


def _query_source(
    conn: Any,
    source: dict[str, Any],
    *,
    current_user: dict[str, Any],
    filters: dict[str, Any],
    source_limit: int,
) -> list[dict[str, Any]]:
    table_name = source["table"]
    if not table_exists(conn, table_name):
        return []

    cols = table_columns(conn, table_name)
    if "id" not in cols:
        return []

    title = text_expr(cols, TITLE_COLUMNS, "'Record'")
    summary = text_expr(cols, SUMMARY_COLUMNS, "'Record available for review.'")
    date_time = timestamptz_expr(cols, DATE_COLUMNS)
    metadata = json_expr(cols, ["metadata", "metadata_json", "context_json", "body_map_json", "content"])
    sccif_expr = text_expr(cols, ["sccif_area", "judgement_area", "inspection_area"], "NULL")
    severity_expr = text_expr(cols, ["severity", "significance", "risk_level", "priority"], "NULL")
    category_expr = text_expr(cols, ["category", "record_type", "document_type", "report_type", "event_type", "type"], f"'{source['category']}'")
    status_expr = text_expr(cols, ["status", "workflow_status", "manager_review_status", "approval_status"], "NULL")
    regulation_expr = "regulation_refs" if "regulation_refs" in cols else "ARRAY[]::text[]"
    tags_expr = "tags" if "tags" in cols else "ARRAY[]::text[]"

    select_parts = [
        "id::text AS id",
        f"{title} AS title",
        f"{summary} AS summary",
        f"{summary} AS full_text",
        f"{date_time} AS date_time",
        f"{category_expr} AS category",
        f"{severity_expr} AS severity",
        f"{status_expr} AS status",
        f"{metadata} AS metadata",
        f"{sccif_expr} AS sccif_area",
        f"{regulation_expr} AS regulation_refs",
        f"{tags_expr} AS tags",
    ]

    for col in ["young_person_id", "home_id", "provider_id", "staff_id", "author_id", "created_by", "owner_id", "created_at"]:
        select_parts.append(f"{quote_ident(col)} AS {col}" if col in cols else f"NULL AS {col}")
    for col in ["source_table", "source_id"]:
        select_parts.append(f"{quote_ident(col)} AS {col}" if col in cols else f"NULL AS {col}")

    where, params = build_scope_where(
        cols,
        current_user,
        home_id=filters.get("home_id"),
        young_person_id=filters.get("young_person_id"),
        staff_id=filters.get("staff_id"),
    )

    if filters.get("date_from"):
        where.append(f"{date_time} >= %s::timestamptz")
        params.append(filters["date_from"])
    if filters.get("date_to"):
        where.append(f"{date_time} <= %s::timestamptz")
        params.append(filters["date_to"])
    if filters.get("search"):
        where.append(f"({title} ILIKE %s OR {summary} ILIKE %s)")
        term = f"%{filters['search']}%"
        params.extend([term, term])
    if filters.get("source_type") and filters["source_type"] != source["source_type"]:
        return []
    if filters.get("safeguarding_only") and source["source_type"] not in {"safeguarding", "incident", "risk_assessment", "risk_review"}:
        if "safeguarding_relevant" in cols:
            where.append("COALESCE(safeguarding_relevant, FALSE) = TRUE")
        else:
            return []
    if filters.get("risk_only") and source["source_type"] not in {"risk_assessment", "risk_review", "incident"}:
        return []

    params.append(source_limit)
    where_sql = "WHERE " + " AND ".join(where) if where else ""
    query = f"""
        SELECT {", ".join(select_parts)}
        FROM public.{quote_ident(table_name)}
        {where_sql}
        ORDER BY date_time DESC NULLS LAST, id DESC
        LIMIT %s
    """

    with conn.cursor() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall() or []
        description = getattr(cur, "description", None)

    normalised: list[dict[str, Any]] = []
    for row in rows:
        if isinstance(row, dict):
            payload = dict(row)
        elif description:
            payload = dict(zip([desc[0] for desc in description], row))
        else:
            payload = {}
        normalised.append(_normalise_row(payload, source))
    return normalised


def list_chronology(
    *,
    current_user: dict[str, Any],
    filters: dict[str, Any] | None = None,
    page: int = 1,
    page_size: int = 50,
) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        return list_chronology_for_connection(
            conn,
            current_user=current_user,
            filters=filters,
            page=page,
            page_size=page_size,
        )
    finally:
        release_db_connection(conn)


def _chronology_sources_for_filters(filters: dict[str, Any]) -> list[dict[str, Any]]:
    requested = str(filters.get("source_type") or filters.get("type") or "").strip().lower()
    if requested:
        return [source for source in SOURCE_TABLES if source["source_type"] == requested]
    return SOURCE_TABLES


def list_chronology_for_connection(
    conn: Any,
    *,
    current_user: dict[str, Any],
    filters: dict[str, Any] | None = None,
    page: int = 1,
    page_size: int = 50,
) -> dict[str, Any]:
    started = time.perf_counter()
    filters = filters or {}
    page = max(1, int(page or 1))
    page_size = max(1, min(int(page_size or 50), 200))
    needed_count = page * page_size
    source_limit = min(max(needed_count + page_size, 50), 120)
    requested_source = str(filters.get("source_type") or filters.get("type") or "").strip().lower()

    items: list[dict[str, Any]] = []
    query_started = time.perf_counter()
    stage_ms: dict[str, float] = {}
    supplemental_skipped = False

    if not requested_source:
        priority_started = time.perf_counter()
        for source in PRIORITY_CHRONOLOGY_SOURCES:
            items.extend(
                _query_source(
                    conn,
                    source,
                    current_user=current_user,
                    filters=filters,
                    source_limit=source_limit,
                )
            )
            if len(items) >= needed_count:
                break
        items = _dedupe_chronology_items(items)
        stage_ms["priority_query_ms"] = round((time.perf_counter() - priority_started) * 1000, 2)

        if len(items) >= needed_count:
            sources = PRIORITY_CHRONOLOGY_SOURCES
            supplemental_skipped = True
        else:
            supplemental_started = time.perf_counter()
            for source in SUPPLEMENTAL_CHRONOLOGY_SOURCES:
                items.extend(
                    _query_source(
                        conn,
                        source,
                        current_user=current_user,
                        filters=filters,
                        source_limit=source_limit,
                    )
                )
                items = _dedupe_chronology_items(items)
                if len(items) >= needed_count:
                    break
            stage_ms["supplemental_query_ms"] = round((time.perf_counter() - supplemental_started) * 1000, 2)
            sources = PRIORITY_CHRONOLOGY_SOURCES + SUPPLEMENTAL_CHRONOLOGY_SOURCES
    else:
        filtered_started = time.perf_counter()
        for source in _chronology_sources_for_filters(filters):
            items.extend(
                _query_source(
                    conn,
                    source,
                    current_user=current_user,
                    filters=filters,
                    source_limit=source_limit,
                )
            )
        items = _dedupe_chronology_items(items)
        stage_ms["filtered_query_ms"] = round((time.perf_counter() - filtered_started) * 1000, 2)
        sources = _chronology_sources_for_filters(filters)

    query_ms = round((time.perf_counter() - query_started) * 1000, 2)
    filter_started = time.perf_counter()

    if filters.get("category"):
        category = str(filters["category"]).lower()
        items = [item for item in items if category in str(item.get("category") or "").lower()]
    if filters.get("regulation"):
        regulation = str(filters["regulation"]).lower()
        items = [
            item
            for item in items
            if any(regulation in str(link.get("regulation") or "").lower() for link in item.get("regulation_links") or [])
        ]
    if filters.get("actions_required"):
        items = [item for item in items if item.get("action_ids") or "manager-review" in set(item.get("tags") or [])]
    if filters.get("evidence_only"):
        items = [item for item in items if item.get("evidence_ids") or item.get("source_type") == "evidence"]

    items.sort(key=lambda item: item.get("date_time") or "", reverse=True)
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    total_ms = round((time.perf_counter() - started) * 1000, 2)
    filter_ms = round((time.perf_counter() - filter_started) * 1000, 2)
    timing = {
        "query_ms": query_ms,
        "filter_ms": filter_ms,
        "total_ms": total_ms,
        "source_limit": source_limit,
        "needed_count": needed_count,
        "supplemental_skipped": supplemental_skipped,
        "sources_queried": len(sources),
        **stage_ms,
    }
    logger.info(
        "chronology_query young_person_id=%s source_type=%s items=%s query_ms=%s total_ms=%s sources=%s supplemental_skipped=%s",
        filters.get("young_person_id"),
        requested_source or "all",
        total,
        query_ms,
        total_ms,
        len(sources),
        supplemental_skipped,
    )
    return {
        "items": items[start:end],
        "page": page,
        "page_size": page_size,
        "total": total,
        "has_more": end < total,
        "timing": timing,
    }


def _dedupe_chronology_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_source: dict[str, dict[str, Any]] = {}
    for item in items:
        key = str(item.get("canonical_source_key") or "")
        if not key:
            by_source[f"event:{item.get('id')}"] = item
            continue
        existing = by_source.get(key)
        if not existing:
            by_source[key] = item
            continue
        existing_is_projection = existing.get("source_type") in {"chronology", "os_chronology"}
        item_is_projection = item.get("source_type") in {"chronology", "os_chronology"}
        if existing_is_projection and not item_is_projection:
            by_source[key] = item
    return list(by_source.values())


def get_chronology_event(*, event_id: str, current_user: dict[str, Any]) -> dict[str, Any] | None:
    from repositories.os_repository_utils import normalise_federated_id, parse_federated_id

    decoded_id = normalise_federated_id(event_id)
    source_type, source_id = parse_federated_id(decoded_id)
    page = list_chronology(
        current_user=current_user,
        filters={"source_type": source_type} if source_type else {},
        page=1,
        page_size=500,
    )
    lookup_ids = {decoded_id, event_id}
    if source_id:
        lookup_ids.add(source_id)
        if source_type:
            lookup_ids.add(f"{source_type}:{source_id}")
    for item in page["items"]:
        item_id = str(item.get("id") or "")
        item_source_id = str(item.get("source_id") or "")
        if item_id in lookup_ids or item_source_id in lookup_ids:
            return item
    return None

