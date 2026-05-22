from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor

from auth.dependencies import get_current_user
from db.connection import get_db
from repositories.os_repository_utils import table_columns, table_exists
from repositories.workspaces_repository import get_young_person
from services.child_experience_intelligence_service import build_child_experience_intelligence

logger = logging.getLogger("indicare.child_experience_intelligence")

router = APIRouter(
    prefix="/young-people",
    tags=["child-experience-intelligence"],
)


RECORD_SOURCES: tuple[dict[str, Any], ...] = (
    {
        "context_key": "daily_notes",
        "fallback_type": "daily_note",
        "tables": ("daily_notes", "young_person_daily_notes"),
        "date_columns": ("note_date", "created_at", "updated_at"),
        "limit": 120,
    },
    {
        "context_key": "incidents",
        "fallback_type": "incident",
        "tables": ("incidents", "young_person_incidents"),
        "date_columns": ("incident_datetime", "created_at", "updated_at"),
        "limit": 120,
    },
    {
        "context_key": "safeguarding",
        "fallback_type": "safeguarding",
        "tables": (
            "safeguarding_records",
            "young_person_safeguarding",
            "young_people_safeguarding",
        ),
        "date_columns": ("created_at", "updated_at", "event_at"),
        "limit": 100,
    },
    {
        "context_key": "keywork",
        "fallback_type": "keywork",
        "tables": ("keywork_sessions", "young_person_keywork", "keywork"),
        "date_columns": ("session_date", "created_at", "updated_at"),
        "limit": 100,
    },
    {
        "context_key": "education",
        "fallback_type": "education",
        "tables": ("education_records", "young_person_education"),
        "date_columns": ("created_at", "updated_at", "event_at"),
        "limit": 80,
    },
    {
        "context_key": "health",
        "fallback_type": "health",
        "tables": ("health_records", "young_person_health"),
        "date_columns": ("created_at", "updated_at", "event_at"),
        "limit": 80,
    },
    {
        "context_key": "family",
        "fallback_type": "family_contact",
        "tables": ("family_contacts", "young_person_family", "family_contact"),
        "date_columns": ("contact_date", "created_at", "updated_at"),
        "limit": 80,
    },
    {
        "context_key": "risk",
        "fallback_type": "risk",
        "tables": ("risk_assessments", "young_person_risk"),
        "date_columns": ("created_at", "updated_at"),
        "limit": 80,
    },
    {
        "context_key": "plans",
        "fallback_type": "plan",
        "tables": ("young_person_plans", "support_plans", "care_plans"),
        "date_columns": ("created_at", "updated_at"),
        "limit": 80,
    },
    {
        "context_key": "reviews",
        "fallback_type": "review",
        "tables": ("monthly_reviews", "young_person_reviews"),
        "date_columns": ("created_at", "updated_at", "review_date"),
        "limit": 80,
    },
    {
        "context_key": "chronology",
        "fallback_type": "chronology",
        "tables": ("young_people_chronology", "young_person_chronology", "chronology_events"),
        "date_columns": ("event_at", "created_at", "updated_at"),
        "limit": 160,
    },
)


def _safe_int(value: Any) -> int | None:
    try:
        parsed = int(value)
        return parsed if parsed > 0 else None
    except Exception:
        return None


def _user_role(current_user: dict[str, Any]) -> str:
    return str(
        current_user.get("role")
        or current_user.get("user_role")
        or current_user.get("account_role")
        or ""
    ).strip().lower()


def _allowed_home_ids(current_user: dict[str, Any]) -> set[int]:
    raw_values = (
        current_user.get("allowed_home_ids")
        or current_user.get("home_ids")
        or current_user.get("homes")
        or []
    )

    values: set[int] = set()

    if isinstance(raw_values, list):
        for item in raw_values:
            if isinstance(item, dict):
                home_id = _safe_int(item.get("id") or item.get("home_id"))
            else:
                home_id = _safe_int(item)

            if home_id:
                values.add(home_id)

    direct_home_id = _safe_int(
        current_user.get("home_id")
        or current_user.get("homeId")
        or current_user.get("selected_home_id")
    )

    if direct_home_id:
        values.add(direct_home_id)

    return values


def _can_access_home(current_user: dict[str, Any], home_id: int | None) -> bool:
    role = _user_role(current_user)

    if role in {
        "founder",
        "owner",
        "super_admin",
        "superadmin",
        "admin",
        "administrator",
        "responsible_individual",
        "ri",
        "provider_admin",
        "manager",
        "registered_manager",
    }:
        return True

    if not home_id:
        return False

    return home_id in _allowed_home_ids(current_user)


def _row_to_dict(row: Any) -> dict[str, Any]:
    return dict(row) if row else {}


def _rows_to_list(rows: Any) -> list[dict[str, Any]]:
    return [dict(row) for row in rows or []]


def _first_existing_column(conn: Any, table: str, candidates: tuple[str, ...]) -> str | None:
    cols = table_columns(conn, table)
    for column in candidates:
        if column in cols:
            return column
    return None


def _get_young_person(
    conn: Any,
    young_person_id: int,
    *,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    return get_young_person(
        conn,
        young_person_id=young_person_id,
        current_user=current_user,
    ) or {}


def _fetch_source_records(
    conn: Any,
    *,
    source: dict[str, Any],
    young_person_id: int,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    context_key = str(source["context_key"])
    fallback_type = str(source["fallback_type"])
    tables = tuple(source["tables"])
    date_columns = tuple(source["date_columns"])
    limit = int(source.get("limit") or 80)

    attempted_tables: list[str] = []

    try:
        for table in tables:
            attempted_tables.append(table)

            if not table_exists(conn, table):
                continue

            cols = table_columns(conn, table)
            if "young_person_id" not in cols:
                continue

            date_column = _first_existing_column(conn, table, date_columns)
            order_clause = (
                f'ORDER BY "{date_column}" DESC NULLS LAST'
                if date_column
                else "ORDER BY id DESC"
            )

            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    SELECT *
                    FROM public."{table}"
                    WHERE young_person_id = %s
                    {order_clause}
                    LIMIT %s
                    """,
                    (young_person_id, limit),
                )
                rows = cur.fetchall() or []

            records = _rows_to_list(rows)

            for record in records:
                record.setdefault("record_type", fallback_type)
                record.setdefault("_source_table", table)
                record.setdefault("_source_context", context_key)

            return records, {
                "context_key": context_key,
                "source_table": table,
                "attempted_tables": attempted_tables,
                "record_count": len(records),
                "date_column": date_column,
                "loaded": True,
            }

        return [], {
            "context_key": context_key,
            "source_table": None,
            "attempted_tables": attempted_tables,
            "record_count": 0,
            "date_column": None,
            "loaded": False,
        }

    except Exception as exc:
        logger.exception(
            "Failed to fetch CEI records | young_person_id=%s context_key=%s",
            young_person_id,
            context_key,
        )

        return [], {
            "context_key": context_key,
            "source_table": None,
            "attempted_tables": attempted_tables,
            "record_count": 0,
            "date_column": None,
            "loaded": False,
            "error": exc.__class__.__name__,
        }


def _build_child_experience_context(
    conn: Any,
    *,
    young_person_id: int,
    current_user: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    young_person = _get_young_person(conn, young_person_id, current_user=current_user)

    if not young_person:
        raise HTTPException(status_code=404, detail="Young person not found.")

    context: dict[str, Any] = {
        "young_person": young_person,
    }

    coverage: dict[str, Any] = {
        "young_person_loaded": True,
        "sources": [],
        "total_records_loaded": 0,
    }

    for source in RECORD_SOURCES:
        records, source_coverage = _fetch_source_records(
            conn,
            source=source,
            young_person_id=young_person_id,
        )

        context[str(source["context_key"])] = records
        coverage["sources"].append(source_coverage)
        coverage["total_records_loaded"] += len(records)

    return context, coverage


@router.get("/{young_person_id}/experience-intelligence")
def get_child_experience_intelligence(
    young_person_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    young_person = _get_young_person(conn, young_person_id, current_user=current_user)

    if not young_person:
        raise HTTPException(status_code=404, detail="Young person not found.")

    home_id = _safe_int(
        young_person.get("home_id")
        or young_person.get("homeId")
        or young_person.get("current_home_id")
    )

    if not _can_access_home(current_user, home_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this young person's Child Experience Intelligence.",
        )

    context, coverage = _build_child_experience_context(
        conn,
        young_person_id=young_person_id,
        current_user=current_user,
    )

    intelligence = build_child_experience_intelligence(
        young_person_id=young_person_id,
        context=context,
    )

    intelligence["context_coverage"] = coverage

    return {
        "status": "ok",
        "young_person_id": young_person_id,
        "home_id": home_id,
        "context_coverage": coverage,
        "intelligence": intelligence,
    }
