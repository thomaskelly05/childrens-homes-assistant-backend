from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_current_user
from db.connection import get_db_connection, release_db_connection
from services.child_experience_intelligence_service import (
    build_child_experience_intelligence,
)


router = APIRouter(
    prefix="/young-people",
    tags=["child-experience-intelligence"],
)


# ============================================================
# HELPERS
# ============================================================

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
        "responsible_individual",
        "ri",
        "provider_admin",
    }:
        return True

    if not home_id:
        return False

    return home_id in _allowed_home_ids(current_user)


def _row_to_dict(row: Any) -> dict[str, Any]:
    return dict(row) if row else {}


def _rows_to_list(rows: Any) -> list[dict[str, Any]]:
    return [dict(row) for row in rows or []]


async def _get_young_person(young_person_id: int) -> dict[str, Any]:
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            SELECT *
            FROM young_people
            WHERE id = $1
            """,
            young_person_id,
        )
        return _row_to_dict(row)
    finally:
        await release_db_connection(conn)


async def _fetch_optional_records(
    *,
    table: str,
    young_person_id: int,
    date_column: str = "created_at",
    limit: int = 80,
) -> list[dict[str, Any]]:
    """
    Safely fetches from known IndiCare record tables.

    If a table does not exist in a particular deployment yet, this returns
    an empty list instead of breaking Child Experience Intelligence.
    """
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            f"""
            SELECT *
            FROM {table}
            WHERE young_person_id = $1
            ORDER BY {date_column} DESC NULLS LAST
            LIMIT $2
            """,
            young_person_id,
            limit,
        )
        return _rows_to_list(rows)
    except Exception:
        return []
    finally:
        await release_db_connection(conn)


async def _build_child_experience_context(
    *,
    young_person_id: int,
) -> dict[str, Any]:
    young_person = await _get_young_person(young_person_id)

    if not young_person:
        raise HTTPException(status_code=404, detail="Young person not found.")

    daily_notes = await _fetch_optional_records(
        table="daily_notes",
        young_person_id=young_person_id,
        date_column="note_date",
    )

    incidents = await _fetch_optional_records(
        table="incidents",
        young_person_id=young_person_id,
        date_column="incident_datetime",
    )

    safeguarding = await _fetch_optional_records(
        table="safeguarding_records",
        young_person_id=young_person_id,
        date_column="created_at",
    )

    keywork = await _fetch_optional_records(
        table="keywork_sessions",
        young_person_id=young_person_id,
        date_column="session_date",
    )

    education = await _fetch_optional_records(
        table="education_records",
        young_person_id=young_person_id,
        date_column="created_at",
    )

    health = await _fetch_optional_records(
        table="health_records",
        young_person_id=young_person_id,
        date_column="created_at",
    )

    family = await _fetch_optional_records(
        table="family_contacts",
        young_person_id=young_person_id,
        date_column="contact_date",
    )

    risk = await _fetch_optional_records(
        table="risk_assessments",
        young_person_id=young_person_id,
        date_column="created_at",
    )

    plans = await _fetch_optional_records(
        table="young_person_plans",
        young_person_id=young_person_id,
        date_column="created_at",
    )

    reviews = await _fetch_optional_records(
        table="monthly_reviews",
        young_person_id=young_person_id,
        date_column="created_at",
    )

    chronology = await _fetch_optional_records(
        table="young_people_chronology",
        young_person_id=young_person_id,
        date_column="event_at",
        limit=120,
    )

    return {
        "young_person": young_person,
        "daily_notes": daily_notes,
        "incidents": incidents,
        "safeguarding": safeguarding,
        "keywork": keywork,
        "education": education,
        "health": health,
        "family": family,
        "risk": risk,
        "plans": plans,
        "reviews": reviews,
        "chronology": chronology,
    }


# ============================================================
# ROUTE
# ============================================================

@router.get("/{young_person_id}/experience-intelligence")
async def get_child_experience_intelligence(
    young_person_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    young_person = await _get_young_person(young_person_id)

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

    context = await _build_child_experience_context(
        young_person_id=young_person_id,
    )

    intelligence = build_child_experience_intelligence(
        young_person_id=young_person_id,
        context=context,
    )

    return {
        "status": "ok",
        "young_person_id": young_person_id,
        "home_id": home_id,
        "intelligence": intelligence,
    }