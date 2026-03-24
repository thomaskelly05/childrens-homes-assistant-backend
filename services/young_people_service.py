from __future__ import annotations

import logging
from typing import Any

from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger("indicare.young_people_service")


def _clean_row(row: dict[str, Any] | None) -> dict[str, Any]:
    return dict(row) if row else {}


def _clean_rows(rows: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    return [dict(r) for r in (rows or [])]


def list_young_people(
    home_id: int | None = None,
    include_archived: bool = False,
) -> list[dict[str, Any]]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT
                    yp.id,
                    yp.home_id,
                    yp.first_name,
                    yp.last_name,
                    yp.preferred_name,
                    yp.date_of_birth,
                    yp.gender,
                    yp.ethnicity,
                    yp.nhs_number,
                    yp.local_id_number,
                    yp.admission_date,
                    yp.discharge_date,
                    yp.placement_status,
                    yp.primary_keyworker_id,
                    yp.summary_risk_level,
                    yp.photo_url,
                    yp.archived,
                    yp.created_at,
                    yp.updated_at,
                    h.name AS home_name
                FROM young_people yp
                LEFT JOIN homes h ON h.id = yp.home_id
                WHERE (%s IS NULL OR yp.home_id = %s)
                  AND (%s = TRUE OR COALESCE(yp.archived, FALSE) = FALSE)
                ORDER BY
                    COALESCE(yp.archived, FALSE) ASC,
                    COALESCE(yp.preferred_name, yp.first_name, '') ASC,
                    COALESCE(yp.last_name, '') ASC,
                    yp.id ASC
            """
            cur.execute(query, (home_id, home_id, include_archived))
            rows = cur.fetchall()
            return _clean_rows(rows)
    finally:
        release_db_connection(conn)


def get_young_person_by_id(young_person_id: int) -> dict[str, Any]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    yp.id,
                    yp.home_id,
                    yp.first_name,
                    yp.last_name,
                    yp.preferred_name,
                    yp.date_of_birth,
                    yp.gender,
                    yp.ethnicity,
                    yp.nhs_number,
                    yp.local_id_number,
                    yp.admission_date,
                    yp.discharge_date,
                    yp.placement_status,
                    yp.primary_keyworker_id,
                    yp.summary_risk_level,
                    yp.photo_url,
                    yp.archived,
                    yp.created_at,
                    yp.updated_at,
                    h.name AS home_name
                FROM young_people yp
                LEFT JOIN homes h ON h.id = yp.home_id
                WHERE yp.id = %s
                LIMIT 1
                """,
                (young_person_id,),
            )
            row = cur.fetchone()
            return _clean_row(row)
    finally:
        release_db_connection(conn)


def get_identity_profile(young_person_id: int) -> dict[str, Any]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    young_person_id,
                    religion_or_faith,
                    cultural_identity,
                    first_language,
                    dietary_needs,
                    interests,
                    strengths_summary,
                    what_matters_to_me,
                    important_dates,
                    created_at,
                    updated_at
                FROM young_person_identity_profile
                WHERE young_person_id = %s
                LIMIT 1
                """,
                (young_person_id,),
            )
            return _clean_row(cur.fetchone())
    finally:
        release_db_connection(conn)


def get_communication_profile(young_person_id: int) -> dict[str, Any]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    young_person_id,
                    neurodiversity_summary,
                    communication_style,
                    sensory_profile,
                    processing_needs,
                    signs_of_distress,
                    what_helps,
                    what_to_avoid,
                    routines_and_predictability,
                    visual_support_needs,
                    created_at,
                    updated_at
                FROM young_person_communication_profile
                WHERE young_person_id = %s
                LIMIT 1
                """,
                (young_person_id,),
            )
            return _clean_row(cur.fetchone())
    finally:
        release_db_connection(conn)


def get_education_profile(young_person_id: int) -> dict[str, Any]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    young_person_id,
                    school_name,
                    year_group,
                    education_status,
                    sen_status,
                    ehcp_details,
                    designated_teacher,
                    attendance_baseline,
                    pep_status,
                    support_summary,
                    created_at,
                    updated_at
                FROM young_person_education_profile
                WHERE young_person_id = %s
                LIMIT 1
                """,
                (young_person_id,),
            )
            return _clean_row(cur.fetchone())
    finally:
        release_db_connection(conn)


def get_health_profile(young_person_id: int) -> dict[str, Any]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    young_person_id,
                    gp_name,
                    gp_contact,
                    dentist_name,
                    dentist_contact,
                    optician_name,
                    optician_contact,
                    allergies,
                    diagnoses,
                    mental_health_summary,
                    medication_summary,
                    consent_notes,
                    created_at,
                    updated_at
                FROM young_person_health_profile
                WHERE young_person_id = %s
                LIMIT 1
                """,
                (young_person_id,),
            )
            return _clean_row(cur.fetchone())
    finally:
        release_db_connection(conn)


def get_current_legal_status(young_person_id: int) -> dict[str, Any]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    young_person_id,
                    legal_status,
                    order_type,
                    order_details,
                    delegated_authority_details,
                    restrictions_text,
                    consent_arrangements,
                    effective_from,
                    effective_to,
                    is_current,
                    created_by,
                    created_at,
                    updated_at
                FROM young_person_legal_status
                WHERE young_person_id = %s
                ORDER BY
                    COALESCE(is_current, FALSE) DESC,
                    COALESCE(effective_from, DATE '1900-01-01') DESC,
                    id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            row = cur.fetchone()
            if row:
                return _clean_row(row)

        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    young_person_id,
                    legal_status,
                    order_type,
                    order_details,
                    effective_from,
                    effective_to,
                    is_current,
                    created_at,
                    updated_at
                FROM young_person_legal_statuses
                WHERE young_person_id = %s
                ORDER BY
                    COALESCE(is_current, FALSE) DESC,
                    COALESCE(effective_from, DATE '1900-01-01') DESC,
                    id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            return _clean_row(cur.fetchone())
    finally:
        release_db_connection(conn)


def get_contacts(young_person_id: int) -> list[dict[str, Any]]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    young_person_id,
                    contact_type,
                    full_name,
                    relationship_to_young_person,
                    phone,
                    email,
                    address,
                    is_parental_responsibility_holder,
                    is_approved_contact,
                    is_restricted_contact,
                    supervision_level,
                    notes,
                    created_at,
                    updated_at
                FROM young_person_contacts
                WHERE young_person_id = %s
                ORDER BY
                    COALESCE(is_parental_responsibility_holder, FALSE) DESC,
                    COALESCE(is_approved_contact, FALSE) DESC,
                    COALESCE(full_name, '') ASC,
                    id ASC
                """,
                (young_person_id,),
            )
            return _clean_rows(cur.fetchall())
    finally:
        release_db_connection(conn)


def get_alerts(
    young_person_id: int,
    active_only: bool = False,
) -> list[dict[str, Any]]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    young_person_id,
                    alert_type,
                    title,
                    description,
                    severity,
                    is_active,
                    show_globally,
                    review_date,
                    created_by,
                    resolved_by,
                    resolved_at,
                    created_at,
                    updated_at
                FROM young_person_alerts
                WHERE young_person_id = %s
                  AND (%s = FALSE OR COALESCE(is_active, FALSE) = TRUE)
                ORDER BY
                    COALESCE(is_active, FALSE) DESC,
                    COALESCE(created_at, NOW()) DESC,
                    id DESC
                """,
                (young_person_id, active_only),
            )
            return _clean_rows(cur.fetchall())
    finally:
        release_db_connection(conn)


def get_recent_daily_notes(young_person_id: int, limit: int = 5) -> list[dict[str, Any]]:
    conn = None
    safe_limit = max(1, min(limit, 20))
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    young_person_id,
                    note_date,
                    shift_type,
                    mood,
                    presentation,
                    positives,
                    actions_required,
                    workflow_status,
                    created_at,
                    updated_at
                FROM daily_notes
                WHERE young_person_id = %s
                ORDER BY
                    COALESCE(note_date, CURRENT_DATE) DESC,
                    id DESC
                LIMIT %s
                """,
                (young_person_id, safe_limit),
            )
            return _clean_rows(cur.fetchall())
    finally:
        release_db_connection(conn)


def get_recent_incidents(young_person_id: int, limit: int = 5) -> list[dict[str, Any]]:
    conn = None
    safe_limit = max(1, min(limit, 20))
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    young_person_id,
                    incident_type,
                    incident_datetime,
                    location,
                    severity,
                    safeguarding_flag,
                    police_involved,
                    manager_review_status,
                    workflow_status,
                    outcome,
                    created_at,
                    updated_at
                FROM incidents
                WHERE young_person_id = %s
                ORDER BY
                    COALESCE(incident_datetime, created_at) DESC,
                    id DESC
                LIMIT %s
                """,
                (young_person_id, safe_limit),
            )
            return _clean_rows(cur.fetchall())
    finally:
        release_db_connection(conn)


def get_recent_keywork_sessions(young_person_id: int, limit: int = 5) -> list[dict[str, Any]]:
    conn = None
    safe_limit = max(1, min(limit, 20))
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    young_person_id,
                    session_date,
                    topic,
                    purpose,
                    summary,
                    child_voice,
                    actions_agreed,
                    status,
                    workflow_status,
                    created_at,
                    updated_at
                FROM keywork_sessions
                WHERE young_person_id = %s
                ORDER BY
                    COALESCE(session_date, CURRENT_DATE) DESC,
                    id DESC
                LIMIT %s
                """,
                (young_person_id, safe_limit),
            )
            return _clean_rows(cur.fetchall())
    finally:
        release_db_connection(conn)


def get_recent_chronology(young_person_id: int, limit: int = 10) -> list[dict[str, Any]]:
    conn = None
    safe_limit = max(1, min(limit, 50))
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    young_person_id,
                    event_datetime,
                    category,
                    subcategory,
                    title,
                    summary,
                    significance,
                    source_table,
                    source_id,
                    event_status,
                    linked_standard,
                    linked_judgement_area,
                    created_at,
                    updated_at
                FROM chronology_events
                WHERE young_person_id = %s
                ORDER BY
                    COALESCE(event_datetime, created_at) DESC,
                    id DESC
                LIMIT %s
                """,
                (young_person_id, safe_limit),
            )
            return _clean_rows(cur.fetchall())
    finally:
        release_db_connection(conn)


def get_young_person_overview(young_person_id: int) -> dict[str, Any]:
    young_person = get_young_person_by_id(young_person_id)
    if not young_person:
      return {}

    overview = {
        "young_person": young_person,
        "identity_profile": get_identity_profile(young_person_id),
        "communication_profile": get_communication_profile(young_person_id),
        "education_profile": get_education_profile(young_person_id),
        "health_profile": get_health_profile(young_person_id),
        "legal_status": get_current_legal_status(young_person_id),
        "contacts": get_contacts(young_person_id),
        "alerts": get_alerts(young_person_id, active_only=False),
        "recent_daily_notes": get_recent_daily_notes(young_person_id, limit=5),
        "recent_incidents": get_recent_incidents(young_person_id, limit=5),
        "recent_keywork_sessions": get_recent_keywork_sessions(young_person_id, limit=5),
        "recent_chronology": get_recent_chronology(young_person_id, limit=10),
    }

    return overview


def create_young_person(payload: dict[str, Any]) -> dict[str, Any]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO young_people (
                    home_id,
                    first_name,
                    last_name,
                    preferred_name,
                    date_of_birth,
                    gender,
                    ethnicity,
                    nhs_number,
                    local_id_number,
                    admission_date,
                    discharge_date,
                    placement_status,
                    primary_keyworker_id,
                    summary_risk_level,
                    photo_url,
                    archived
                )
                VALUES (
                    %(home_id)s,
                    %(first_name)s,
                    %(last_name)s,
                    %(preferred_name)s,
                    %(date_of_birth)s,
                    %(gender)s,
                    %(ethnicity)s,
                    %(nhs_number)s,
                    %(local_id_number)s,
                    %(admission_date)s,
                    %(discharge_date)s,
                    %(placement_status)s,
                    %(primary_keyworker_id)s,
                    %(summary_risk_level)s,
                    %(photo_url)s,
                    %(archived)s
                )
                RETURNING *
                """,
                {
                    "home_id": payload.get("home_id"),
                    "first_name": payload.get("first_name"),
                    "last_name": payload.get("last_name"),
                    "preferred_name": payload.get("preferred_name"),
                    "date_of_birth": payload.get("date_of_birth"),
                    "gender": payload.get("gender"),
                    "ethnicity": payload.get("ethnicity"),
                    "nhs_number": payload.get("nhs_number"),
                    "local_id_number": payload.get("local_id_number"),
                    "admission_date": payload.get("admission_date"),
                    "discharge_date": payload.get("discharge_date"),
                    "placement_status": payload.get("placement_status"),
                    "primary_keyworker_id": payload.get("primary_keyworker_id"),
                    "summary_risk_level": payload.get("summary_risk_level"),
                    "photo_url": payload.get("photo_url"),
                    "archived": payload.get("archived", False),
                },
            )
            row = cur.fetchone()
        conn.commit()
        return _clean_row(row)
    except Exception:
        if conn and not conn.closed:
            conn.rollback()
        logger.exception("Failed to create young person")
        raise
    finally:
        release_db_connection(conn)


def update_young_person(young_person_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE young_people
                SET
                    home_id = COALESCE(%(home_id)s, home_id),
                    first_name = COALESCE(%(first_name)s, first_name),
                    last_name = COALESCE(%(last_name)s, last_name),
                    preferred_name = COALESCE(%(preferred_name)s, preferred_name),
                    date_of_birth = COALESCE(%(date_of_birth)s, date_of_birth),
                    gender = COALESCE(%(gender)s, gender),
                    ethnicity = COALESCE(%(ethnicity)s, ethnicity),
                    nhs_number = COALESCE(%(nhs_number)s, nhs_number),
                    local_id_number = COALESCE(%(local_id_number)s, local_id_number),
                    admission_date = COALESCE(%(admission_date)s, admission_date),
                    discharge_date = COALESCE(%(discharge_date)s, discharge_date),
                    placement_status = COALESCE(%(placement_status)s, placement_status),
                    primary_keyworker_id = COALESCE(%(primary_keyworker_id)s, primary_keyworker_id),
                    summary_risk_level = COALESCE(%(summary_risk_level)s, summary_risk_level),
                    photo_url = COALESCE(%(photo_url)s, photo_url),
                    archived = COALESCE(%(archived)s, archived),
                    updated_at = NOW()
                WHERE id = %(young_person_id)s
                RETURNING *
                """,
                {
                    "young_person_id": young_person_id,
                    "home_id": payload.get("home_id"),
                    "first_name": payload.get("first_name"),
                    "last_name": payload.get("last_name"),
                    "preferred_name": payload.get("preferred_name"),
                    "date_of_birth": payload.get("date_of_birth"),
                    "gender": payload.get("gender"),
                    "ethnicity": payload.get("ethnicity"),
                    "nhs_number": payload.get("nhs_number"),
                    "local_id_number": payload.get("local_id_number"),
                    "admission_date": payload.get("admission_date"),
                    "discharge_date": payload.get("discharge_date"),
                    "placement_status": payload.get("placement_status"),
                    "primary_keyworker_id": payload.get("primary_keyworker_id"),
                    "summary_risk_level": payload.get("summary_risk_level"),
                    "photo_url": payload.get("photo_url"),
                    "archived": payload.get("archived"),
                },
            )
            row = cur.fetchone()
        conn.commit()
        return _clean_row(row)
    except Exception:
        if conn and not conn.closed:
            conn.rollback()
        logger.exception("Failed to update young person id=%s", young_person_id)
        raise
    finally:
        release_db_connection(conn)
