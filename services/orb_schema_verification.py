"""ORB Residential schema and migration verification helpers."""

from __future__ import annotations

import logging
from typing import Any

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection

logger = logging.getLogger("indicare.orb_schema_verification")

CANONICAL_SAVED_OUTPUT_COLUMNS = frozenset(
    {
        "id",
        "user_id",
        "project_id",
        "project_name",
        "title",
        "type",
        "status",
        "profile_ids",
        "tags",
        "summary",
        "content_markdown",
        "content_json",
        "intelligence_output",
        "sources",
        "citations",
        "quality",
        "model_routing",
        "retrieval_context",
        "created_from",
        "created_from_id",
        "standalone_only",
        "os_linked",
        "care_record_access",
        "metadata",
        "created_at",
        "updated_at",
        "archived_at",
    }
)

KNOWLEDGE_PRIVACY_COLUMNS = frozenset(
    {
        "source_scope",
        "uploaded_by_user_id",
        "owner_user_id",
        "organisation_id",
    }
)


def _table_columns(table_name: str) -> set[str] | None:
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = %s
                    """,
                    (table_name,),
                )
                rows = cur.fetchall()
                if not rows:
                    return None
                return {str(row[0]) for row in rows}
        finally:
            release_db_connection(conn)
    except (DatabaseUnavailableError, Exception):
        logger.debug("Could not read columns for %s", table_name, exc_info=True)
        return None


def verify_saved_outputs_schema() -> dict[str, Any]:
    columns = _table_columns("orb_saved_outputs")
    if columns is None:
        return {
            "status": "degraded",
            "message": "orb_saved_outputs table not present (in-memory fallback may be active)",
            "canonical": False,
            "missing_columns": sorted(CANONICAL_SAVED_OUTPUT_COLUMNS),
        }
    missing = sorted(CANONICAL_SAVED_OUTPUT_COLUMNS - columns)
    legacy_markers = []
    if "workflow" in columns or "output_type" in columns:
        legacy_markers.append("200_premium_shape")
    if missing:
        return {
            "status": "fail",
            "message": "orb_saved_outputs is missing canonical columns",
            "canonical": False,
            "missing_columns": missing,
            "legacy_shape": legacy_markers or None,
        }
    if "user_id" not in columns:
        return {
            "status": "fail",
            "message": "orb_saved_outputs lacks user_id — outputs must be user-scoped",
            "canonical": False,
            "missing_columns": ["user_id"],
        }
    return {
        "status": "ok",
        "message": "orb_saved_outputs canonical schema present",
        "canonical": True,
        "missing_columns": [],
        "legacy_shape": legacy_markers or None,
    }


def verify_knowledge_privacy_columns() -> dict[str, Any]:
    columns = _table_columns("orb_knowledge_sources")
    if columns is None:
        return {
            "status": "degraded",
            "message": "orb_knowledge_sources not in database (memory mode)",
            "columns_present": [],
        }
    present = sorted(KNOWLEDGE_PRIVACY_COLUMNS & columns)
    missing = sorted(KNOWLEDGE_PRIVACY_COLUMNS - columns)
    if missing:
        return {
            "status": "degraded",
            "message": "Knowledge privacy columns partially missing; service uses metadata fallbacks",
            "columns_present": present,
            "missing_columns": missing,
        }
    return {
        "status": "ok",
        "message": "Knowledge privacy columns present",
        "columns_present": present,
    }


def verify_table_exists(table_name: str) -> dict[str, Any]:
    columns = _table_columns(table_name)
    if columns is None:
        return {"status": "degraded", "message": f"{table_name} not found"}
    return {"status": "ok", "message": f"{table_name} present", "column_count": len(columns)}


def run_orb_migration_checks() -> dict[str, Any]:
    checks = {
        "saved_outputs_schema": verify_saved_outputs_schema(),
        "knowledge_privacy_columns": verify_knowledge_privacy_columns(),
        "orb_projects": verify_table_exists("orb_saved_projects"),
        "orb_usage_events": verify_table_exists("orb_usage_events"),
        "orb_subscriptions": verify_table_exists("orb_subscriptions"),
        "orb_stripe_events": verify_table_exists("orb_stripe_events"),
        "orb_safety_acceptance": verify_table_exists("orb_safety_acceptance"),
    }
    statuses = [str(item.get("status") or "fail") for item in checks.values()]
    if any(status == "fail" for status in statuses):
        overall = "fail"
    elif any(status == "degraded" for status in statuses):
        overall = "degraded"
    else:
        overall = "ok"
    return {"status": overall, "checks": checks}
