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


MIGRATION_207_PATH = "sql/207_orb_saved_outputs_canonical.sql"


def saved_outputs_schema_state() -> dict[str, Any]:
    """Runtime snapshot of orb_saved_outputs schema for service guards."""
    columns = _table_columns("orb_saved_outputs")
    if columns is None:
        return {
            "exists": False,
            "canonical": False,
            "missing_columns": sorted(CANONICAL_SAVED_OUTPUT_COLUMNS),
            "has_user_id": False,
            "has_status": False,
            "user_scoped": False,
            "migration_required": False,
        }
    missing = sorted(CANONICAL_SAVED_OUTPUT_COLUMNS - columns)
    has_user_id = "user_id" in columns
    has_status = "status" in columns
    canonical = not missing and has_user_id
    return {
        "exists": True,
        "canonical": canonical,
        "missing_columns": missing,
        "has_user_id": has_user_id,
        "has_status": has_status,
        "user_scoped": has_user_id,
        "migration_required": bool(missing) or not has_user_id,
    }


def verify_saved_outputs_schema() -> dict[str, Any]:
    state = saved_outputs_schema_state()
    if not state["exists"]:
        return {
            "status": "degraded",
            "message": "orb_saved_outputs table not present (in-memory fallback may be active)",
            "canonical": False,
            "table_exists": False,
            "user_scoped": False,
            "migration_required": False,
            "missing_columns": state["missing_columns"],
            "migration": MIGRATION_207_PATH,
        }
    columns = _table_columns("orb_saved_outputs") or set()
    legacy_markers: list[str] = []
    if "workflow" in columns or "output_type" in columns:
        legacy_markers.append("200_premium_shape")
    if not state["has_user_id"]:
        return {
            "status": "fail",
            "message": "orb_saved_outputs table is legacy and not user-scoped",
            "canonical": False,
            "table_exists": True,
            "user_scoped": False,
            "migration_required": True,
            "missing_columns": state["missing_columns"] or ["user_id"],
            "legacy_shape": legacy_markers or None,
            "migration": MIGRATION_207_PATH,
        }
    if state["missing_columns"]:
        missing_list = ", ".join(state["missing_columns"])
        return {
            "status": "fail",
            "message": f"orb_saved_outputs missing required columns: {missing_list}",
            "canonical": False,
            "table_exists": True,
            "user_scoped": True,
            "migration_required": True,
            "missing_columns": state["missing_columns"],
            "legacy_shape": legacy_markers or None,
            "migration": MIGRATION_207_PATH,
        }
    return {
        "status": "ok",
        "message": "orb_saved_outputs canonical schema present",
        "canonical": True,
        "table_exists": True,
        "user_scoped": True,
        "migration_required": False,
        "missing_columns": [],
        "legacy_shape": legacy_markers or None,
        "migration": MIGRATION_207_PATH,
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
