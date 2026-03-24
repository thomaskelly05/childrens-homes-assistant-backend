from __future__ import annotations

import logging
from typing import Any

from psycopg2.extras import RealDictCursor

logger = logging.getLogger("indicare.young_people_service")


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y", "on"}
    return bool(value)


def _normalise_int(value: Any) -> int | None:
    if value in (None, "", "null"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _fetchone_dict(cur) -> dict[str, Any] | None:
    row = cur.fetchone()
    return dict(row) if row else None


def _fetchall_dicts(cur) -> list[dict[str, Any]]:
    rows = cur.fetchall() or []
    return [dict(row) for row in rows]


def list_young_people(
    conn,
    *,
    home_id: int | None = None,
    include_archived: bool = False,
    search: str = "",
) -> list[dict[str, Any]]:
    where_clauses: list[str] = []
    params: list[Any] = []

    if home_id is not None:
        where_clauses.append("yp.home_id = %s")
        params.append(home_id)

    if not include_archived:
        where_clauses.append("COALESCE(yp.archived, FALSE) = FALSE")

    clean_search = _safe_string(search)
    if clean_search:
        where_clauses.append(
            """
            (
                yp.first_name ILIKE %s
                OR yp.last_name ILIKE %s
                OR COALESCE(yp.preferred_name, '') ILIKE %s
            )
            """
        )
        like = f"%{clean_search}%"
        params.extend([like, like, like])

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
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
                h.name AS home_name,
                CONCAT(
                    COALESCE(u.first_name, ''),
                    CASE
                        WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN ' '
                        ELSE ''
                    END,
                    COALESCE(u.last_name, '')
                ) AS primary_keyworker_name
            FROM young_people yp
            LEFT JOIN homes h ON h.id = yp.home_id
            LEFT JOIN users u ON u.id = yp.primary_keyworker_id
            {where_sql}
            ORDER BY
                COALESCE(NULLIF(yp.preferred_name, ''), yp.first_name) ASC,
                yp.last_name ASC,
                yp.id DESC
            """,
            tuple(params),
        )
        return _fetchall_dicts(cur)


def get_young_person_by_id(conn, young_person_id: int) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                yp.*,
                h.name AS home_name,
                CONCAT(
                    COALESCE(u.first_name, ''),
                    CASE
                        WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN ' '
                        ELSE ''
                    END,
                    COALESCE(u.last_name, '')
                ) AS primary_keyworker_name
            FROM young_people yp
            LEFT JOIN homes h ON h.id = yp.home_id
            LEFT JOIN users u ON u.id = yp.primary_keyworker_id
            WHERE yp.id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        return _fetchone_dict(cur)


def create_young_person(
    conn,
    *,
    home_id: int,
    first_name: str,
    last_name: str = "",
    preferred_name: str = "",
    date_of_birth: Any = None,
    gender: str = "",
    ethnicity: str = "",
    nhs_number: str = "",
    local_id_number: str = "",
    admission_date: Any = None,
    discharge_date: Any = None,
    placement_status: str = "",
    primary_keyworker_id: int | None = None,
    summary_risk_level: str = "",
    photo_url: str = "",
    archived: bool = False,
) -> dict[str, Any]:
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
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING *
            """,
            (
                home_id,
                _safe_string(first_name),
                _safe_string(last_name),
                _safe_string(preferred_name),
                date_of_birth,
                _safe_string(gender),
                _safe_string(ethnicity),
                _safe_string(nhs_number),
                _safe_string(local_id_number),
                admission_date,
                discharge_date,
                _safe_string(placement_status),
                primary_keyworker_id,
                _safe_string(summary_risk_level),
                _safe_string(photo_url),
                archived,
            ),
        )
        row = _fetchone_dict(cur)

    conn.commit()
    return row or {}


def update_young_person(
    conn,
    young_person_id: int,
    payload: dict[str, Any],
) -> dict[str, Any] | None:
    allowed_fields = {
        "home_id",
        "first_name",
        "last_name",
        "preferred_name",
        "date_of_birth",
        "gender",
        "ethnicity",
        "nhs_number",
        "local_id_number",
        "admission_date",
        "discharge_date",
        "placement_status",
        "primary_keyworker_id",
        "summary_risk_level",
        "photo_url",
        "archived",
    }

    updates: list[str] = []
    params: list[Any] = []

    for key, value in payload.items():
        if key not in allowed_fields:
            continue

        if key in {
            "first_name",
            "last_name",
            "preferred_name",
            "gender",
            "ethnicity",
            "nhs_number",
            "local_id_number",
            "placement_status",
            "summary_risk_level",
            "photo_url",
        }:
            value = _safe_string(value)

        if key in {"home_id", "primary_keyworker_id"}:
            value = _normalise_int(value)

        if key == "archived":
            value = _normalise_bool(value)

        updates.append(f"{key} = %s")
        params.append(value)

    if not updates:
        return get_young_person_by_id(conn, young_person_id)

    updates.append("updated_at = NOW()")
    params.append(young_person_id)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE young_people
            SET {", ".join(updates)}
            WHERE id = %s
            RETURNING *
            """,
            tuple(params),
        )
        row = _fetchone_dict(cur)

    conn.commit()
    return row


def get_young_person_overview(conn, young_person_id: int) -> dict[str, Any]:
    person = get_young_person_by_id(conn, young_person_id)
    if not person:
        return {}

    overview: dict[str, Any] = {"young_person": person}

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT *
            FROM young_person_communication_profile
            WHERE young_person_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        )
        overview["communication_profile"] = _fetchone_dict(cur)

        cur.execute(
            """
            SELECT *
            FROM young_person_education_profile
            WHERE young_person_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        )
        overview["education_profile"] = _fetchone_dict(cur)

        cur.execute(
            """
            SELECT *
            FROM young_person_health_profile
            WHERE young_person_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        )
        overview["health_profile"] = _fetchone_dict(cur)

        cur.execute(
            """
            SELECT *
            FROM young_person_identity_profile
            WHERE young_person_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        )
        overview["identity_profile"] = _fetchone_dict(cur)

        cur.execute(
            """
            SELECT *
            FROM young_person_legal_status
            WHERE young_person_id = %s
            ORDER BY is_current DESC, effective_from DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        )
        overview["legal_status"] = _fetchone_dict(cur)

        cur.execute(
            """
            SELECT *
            FROM young_person_contacts
            WHERE young_person_id = %s
            ORDER BY is_parental_responsibility_holder DESC, is_approved_contact DESC, full_name ASC
            """,
            (young_person_id,),
        )
        overview["contacts"] = _fetchall_dicts(cur)

        cur.execute(
            """
            SELECT *
            FROM young_person_alerts
            WHERE young_person_id = %s
            ORDER BY is_active DESC, severity DESC, created_at DESC
            """,
            (young_person_id,),
        )
        overview["alerts"] = _fetchall_dicts(cur)

        cur.execute(
            """
            SELECT COUNT(*)::int AS count
            FROM daily_notes
            WHERE young_person_id = %s
            """,
            (young_person_id,),
        )
        row = _fetchone_dict(cur)
        overview["daily_note_count"] = (row or {}).get("count", 0)

        cur.execute(
            """
            SELECT COUNT(*)::int AS count
            FROM incidents
            WHERE young_person_id = %s
            """,
            (young_person_id,),
        )
        row = _fetchone_dict(cur)
        overview["incident_count"] = (row or {}).get("count", 0)

        cur.execute(
            """
            SELECT COUNT(*)::int AS count
            FROM risk_assessments
            WHERE young_person_id = %s AND COALESCE(archived, FALSE) = FALSE
            """,
            (young_person_id,),
        )
        row = _fetchone_dict(cur)
        overview["active_risk_count"] = (row or {}).get("count", 0)

        cur.execute(
            """
            SELECT COUNT(*)::int AS count
            FROM support_plans
            WHERE young_person_id = %s AND COALESCE(archived, FALSE) = FALSE
            """,
            (young_person_id,),
        )
        row = _fetchone_dict(cur)
        overview["active_support_plan_count"] = (row or {}).get("count", 0)

    return overview


def upsert_communication_profile(
    conn,
    *,
    young_person_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id FROM young_person_communication_profile WHERE young_person_id = %s LIMIT 1",
            (young_person_id,),
        )
        existing = _fetchone_dict(cur)

        values = (
            young_person_id,
            _safe_string(payload.get("neurodiversity_summary")),
            _safe_string(payload.get("communication_style")),
            _safe_string(payload.get("sensory_profile")),
            _safe_string(payload.get("processing_needs")),
            _safe_string(payload.get("signs_of_distress")),
            _safe_string(payload.get("what_helps")),
            _safe_string(payload.get("what_to_avoid")),
            _safe_string(payload.get("routines_and_predictability")),
            _safe_string(payload.get("visual_support_needs")),
        )

        if existing:
            cur.execute(
                """
                UPDATE young_person_communication_profile
                SET
                    neurodiversity_summary = %s,
                    communication_style = %s,
                    sensory_profile = %s,
                    processing_needs = %s,
                    signs_of_distress = %s,
                    what_helps = %s,
                    what_to_avoid = %s,
                    routines_and_predictability = %s,
                    visual_support_needs = %s,
                    updated_at = NOW()
                WHERE young_person_id = %s
                RETURNING *
                """,
                (
                    values[1],
                    values[2],
                    values[3],
                    values[4],
                    values[5],
                    values[6],
                    values[7],
                    values[8],
                    values[9],
                    young_person_id,
                ),
            )
        else:
            cur.execute(
                """
                INSERT INTO young_person_communication_profile (
                    young_person_id,
                    neurodiversity_summary,
                    communication_style,
                    sensory_profile,
                    processing_needs,
                    signs_of_distress,
                    what_helps,
                    what_to_avoid,
                    routines_and_predictability,
                    visual_support_needs
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                values,
            )

        row = _fetchone_dict(cur)

    conn.commit()
    return row or {}


def upsert_education_profile(
    conn,
    *,
    young_person_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id FROM young_person_education_profile WHERE young_person_id = %s LIMIT 1",
            (young_person_id,),
        )
        existing = _fetchone_dict(cur)

        attendance_baseline = payload.get("attendance_baseline")
        if attendance_baseline in ("", None):
            attendance_baseline = None

        if existing:
            cur.execute(
                """
                UPDATE young_person_education_profile
                SET
                    school_name = %s,
                    year_group = %s,
                    education_status = %s,
                    sen_status = %s,
                    ehcp_details = %s,
                    designated_teacher = %s,
                    attendance_baseline = %s,
                    pep_status = %s,
                    support_summary = %s,
                    updated_at = NOW()
                WHERE young_person_id = %s
                RETURNING *
                """,
                (
                    _safe_string(payload.get("school_name")),
                    _safe_string(payload.get("year_group")),
                    _safe_string(payload.get("education_status")),
                    _safe_string(payload.get("sen_status")),
                    _safe_string(payload.get("ehcp_details")),
                    _safe_string(payload.get("designated_teacher")),
                    attendance_baseline,
                    _safe_string(payload.get("pep_status")),
                    _safe_string(payload.get("support_summary")),
                    young_person_id,
                ),
            )
        else:
            cur.execute(
                """
                INSERT INTO young_person_education_profile (
                    young_person_id,
                    school_name,
                    year_group,
                    education_status,
                    sen_status,
                    ehcp_details,
                    designated_teacher,
                    attendance_baseline,
                    pep_status,
                    support_summary
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    young_person_id,
                    _safe_string(payload.get("school_name")),
                    _safe_string(payload.get("year_group")),
                    _safe_string(payload.get("education_status")),
                    _safe_string(payload.get("sen_status")),
                    _safe_string(payload.get("ehcp_details")),
                    _safe_string(payload.get("designated_teacher")),
                    attendance_baseline,
                    _safe_string(payload.get("pep_status")),
                    _safe_string(payload.get("support_summary")),
                ),
            )

        row = _fetchone_dict(cur)

    conn.commit()
    return row or {}


def upsert_health_profile(
    conn,
    *,
    young_person_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id FROM young_person_health_profile WHERE young_person_id = %s LIMIT 1",
            (young_person_id,),
        )
        existing = _fetchone_dict(cur)

        sql_values = (
            _safe_string(payload.get("gp_name")),
            _safe_string(payload.get("gp_contact")),
            _safe_string(payload.get("dentist_name")),
            _safe_string(payload.get("dentist_contact")),
            _safe_string(payload.get("optician_name")),
            _safe_string(payload.get("optician_contact")),
            _safe_string(payload.get("allergies")),
            _safe_string(payload.get("diagnoses")),
            _safe_string(payload.get("mental_health_summary")),
            _safe_string(payload.get("medication_summary")),
            _safe_string(payload.get("consent_notes")),
        )

        if existing:
            cur.execute(
                """
                UPDATE young_person_health_profile
                SET
                    gp_name = %s,
                    gp_contact = %s,
                    dentist_name = %s,
                    dentist_contact = %s,
                    optician_name = %s,
                    optician_contact = %s,
                    allergies = %s,
                    diagnoses = %s,
                    mental_health_summary = %s,
                    medication_summary = %s,
                    consent_notes = %s,
                    updated_at = NOW()
                WHERE young_person_id = %s
                RETURNING *
                """,
                (*sql_values, young_person_id),
            )
        else:
            cur.execute(
                """
                INSERT INTO young_person_health_profile (
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
                    consent_notes
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (young_person_id, *sql_values),
            )

        row = _fetchone_dict(cur)

    conn.commit()
    return row or {}


def upsert_identity_profile(
    conn,
    *,
    young_person_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id FROM young_person_identity_profile WHERE young_person_id = %s LIMIT 1",
            (young_person_id,),
        )
        existing = _fetchone_dict(cur)

        sql_values = (
            _safe_string(payload.get("religion_or_faith")),
            _safe_string(payload.get("cultural_identity")),
            _safe_string(payload.get("first_language")),
            _safe_string(payload.get("dietary_needs")),
            _safe_string(payload.get("interests")),
            _safe_string(payload.get("strengths_summary")),
            _safe_string(payload.get("what_matters_to_me")),
            _safe_string(payload.get("important_dates")),
        )

        if existing:
            cur.execute(
                """
                UPDATE young_person_identity_profile
                SET
                    religion_or_faith = %s,
                    cultural_identity = %s,
                    first_language = %s,
                    dietary_needs = %s,
                    interests = %s,
                    strengths_summary = %s,
                    what_matters_to_me = %s,
                    important_dates = %s,
                    updated_at = NOW()
                WHERE young_person_id = %s
                RETURNING *
                """,
                (*sql_values, young_person_id),
            )
        else:
            cur.execute(
                """
                INSERT INTO young_person_identity_profile (
                    young_person_id,
                    religion_or_faith,
                    cultural_identity,
                    first_language,
                    dietary_needs,
                    interests,
                    strengths_summary,
                    what_matters_to_me,
                    important_dates
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (young_person_id, *sql_values),
            )

        row = _fetchone_dict(cur)

    conn.commit()
    return row or {}


def add_contact(
    conn,
    *,
    young_person_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO young_person_contacts (
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
                notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                young_person_id,
                _safe_string(payload.get("contact_type")),
                _safe_string(payload.get("full_name")),
                _safe_string(payload.get("relationship_to_young_person")),
                _safe_string(payload.get("phone")),
                _safe_string(payload.get("email")),
                _safe_string(payload.get("address")),
                _normalise_bool(payload.get("is_parental_responsibility_holder")),
                _normalise_bool(payload.get("is_approved_contact")),
                _normalise_bool(payload.get("is_restricted_contact")),
                _safe_string(payload.get("supervision_level")),
                _safe_string(payload.get("notes")),
            ),
        )
        row = _fetchone_dict(cur)

    conn.commit()
    return row or {}


def add_alert(
    conn,
    *,
    young_person_id: int,
    created_by: int | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO young_person_alerts (
                young_person_id,
                alert_type,
                title,
                description,
                severity,
                is_active,
                show_globally,
                review_date,
                created_by
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                young_person_id,
                _safe_string(payload.get("alert_type")),
                _safe_string(payload.get("title")),
                _safe_string(payload.get("description")),
                _safe_string(payload.get("severity")),
                _normalise_bool(payload.get("is_active"), True),
                _normalise_bool(payload.get("show_globally")),
                payload.get("review_date"),
                created_by,
            ),
        )
        row = _fetchone_dict(cur)

    conn.commit()
    return row or {}
