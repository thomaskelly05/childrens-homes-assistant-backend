from __future__ import annotations

import logging
from typing import Any

from psycopg2.extras import RealDictCursor

logger = logging.getLogger("indicare.young_people_service")


VALID_PLACEMENT_STATUSES = {
    "active",
    "planned",
    "discharged",
    "transition",
    "emergency",
    "archived",
}

VALID_RISK_LEVELS = {"low", "medium", "high", "critical"}
VALID_ALERT_SEVERITIES = {"low", "medium", "high", "critical"}


def _clean_text(value: Any, *, default: str | None = None) -> str | None:
    if value is None:
        return default
    cleaned = str(value).strip()
    return cleaned or default


def _required_text(value: Any, *, field_name: str, default: str | None = None) -> str:
    cleaned = _clean_text(value, default=default)
    if not cleaned:
        raise ValueError(f"{field_name} is required")
    return cleaned


def _normalise_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y", "on"}
    return bool(value)


def _normalise_int(value: Any) -> int | None:
    if value in (None, "", "null", "None"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalise_status(value: Any, *, default: str = "active") -> str:
    cleaned = str(value or default).strip().lower()
    return cleaned if cleaned in VALID_PLACEMENT_STATUSES else default


def _normalise_risk_level(value: Any) -> str | None:
    cleaned = _clean_text(value)
    if not cleaned:
        return None
    cleaned = cleaned.lower()
    return cleaned if cleaned in VALID_RISK_LEVELS else None


def _normalise_alert_severity(value: Any) -> str:
    cleaned = str(value or "medium").strip().lower()
    return cleaned if cleaned in VALID_ALERT_SEVERITIES else "medium"


def _fetchone_dict(cur) -> dict[str, Any] | None:
    row = cur.fetchone()
    return dict(row) if row else None


def _fetchall_dicts(cur) -> list[dict[str, Any]]:
    rows = cur.fetchall() or []
    return [dict(row) for row in rows]


def _table_exists(conn, table_name: str) -> bool:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT to_regclass(%s) AS table_name", (f"public.{table_name}",))
        row = cur.fetchone()
        return bool(row and row.get("table_name"))


def _get_home_provider_id(conn, home_id: int) -> int | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT provider_id
            FROM homes
            WHERE id = %s
            LIMIT 1
            """,
            (home_id,),
        )
        row = cur.fetchone()
        return _normalise_int(row.get("provider_id")) if row else None


def _get_young_person_provider_id(conn, young_person_id: int) -> int | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT provider_id
            FROM young_people
            WHERE id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        row = cur.fetchone()
        return _normalise_int(row.get("provider_id")) if row else None


def _get_young_person_home_and_provider(conn, young_person_id: int) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, home_id, provider_id
            FROM young_people
            WHERE id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        return _fetchone_dict(cur)


def list_young_people(
    conn,
    *,
    home_id: int | None = None,
    provider_id: int | None = None,
    include_archived: bool = False,
    search: str = "",
    sort_by: str = "last_name",
    sort_dir: str = "asc",
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    allowed_sort_fields = {
        "first_name": "yp.first_name",
        "last_name": "yp.last_name",
        "preferred_name": "yp.preferred_name",
        "placement_status": "yp.placement_status",
        "summary_risk_level": "yp.summary_risk_level",
        "created_at": "yp.created_at",
        "updated_at": "yp.updated_at",
        "admission_date": "yp.admission_date",
    }

    sort_column = allowed_sort_fields.get(str(sort_by or "").strip(), "yp.last_name")
    sort_direction = "DESC" if str(sort_dir or "").lower() == "desc" else "ASC"

    safe_limit = max(1, min(int(limit or 100), 500))
    safe_offset = max(0, int(offset or 0))

    where_clauses = ["1=1"]
    params: list[Any] = []

    if home_id is not None:
        where_clauses.append("yp.home_id = %s")
        params.append(home_id)

    if provider_id is not None:
        where_clauses.append("yp.provider_id = %s")
        params.append(provider_id)

    if not include_archived:
        where_clauses.append("COALESCE(yp.archived, FALSE) = FALSE")

    clean_search = _clean_text(search)
    if clean_search:
        like = f"%{clean_search}%"
        where_clauses.append(
            """
            (
                COALESCE(yp.first_name, '') ILIKE %s
                OR COALESCE(yp.last_name, '') ILIKE %s
                OR COALESCE(yp.preferred_name, '') ILIKE %s
                OR COALESCE(yp.local_id_number, '') ILIKE %s
                OR COALESCE(yp.provider_reference, '') ILIKE %s
            )
            """
        )
        params.extend([like, like, like, like, like])

    params.extend([safe_limit, safe_offset])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
                yp.id,
                yp.provider_id,
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
                yp.profile_photo_path,
                yp.profile_photo_updated_at,
                yp.archived,
                yp.created_at,
                yp.updated_at,
                h.name AS home_name,
                CONCAT_WS(' ', NULLIF(u.first_name, ''), NULLIF(u.last_name, '')) AS primary_keyworker_name
            FROM young_people yp
            LEFT JOIN homes h ON h.id = yp.home_id
            LEFT JOIN users u ON u.id = yp.primary_keyworker_id
            WHERE {" AND ".join(where_clauses)}
            ORDER BY {sort_column} {sort_direction}, yp.id DESC
            LIMIT %s OFFSET %s
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
                CONCAT_WS(' ', NULLIF(u.first_name, ''), NULLIF(u.last_name, '')) AS primary_keyworker_name
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
    placement_status: str = "active",
    primary_keyworker_id: int | None = None,
    summary_risk_level: str = "",
    photo_url: str = "",
    archived: bool = False,
    provider_id: int | None = None,
    **extra: Any,
) -> dict[str, Any]:
    safe_home_id = _normalise_int(home_id)
    if not safe_home_id:
        raise ValueError("home_id is required")

    resolved_provider_id = _normalise_int(provider_id) or _get_home_provider_id(conn, safe_home_id)

    clean_first_name = _required_text(first_name, field_name="first_name")
    clean_last_name = _required_text(last_name, field_name="last_name", default="Unknown")

    if not date_of_birth:
        raise ValueError("date_of_birth is required")

    if not admission_date:
        raise ValueError("admission_date is required")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO young_people (
                provider_id,
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
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING *
            """,
            (
                resolved_provider_id,
                safe_home_id,
                clean_first_name,
                clean_last_name,
                _clean_text(preferred_name),
                date_of_birth,
                _clean_text(gender),
                _clean_text(ethnicity),
                _clean_text(nhs_number),
                _clean_text(local_id_number),
                admission_date,
                discharge_date,
                _normalise_status(placement_status),
                _normalise_int(primary_keyworker_id),
                _normalise_risk_level(summary_risk_level),
                _clean_text(photo_url),
                _normalise_bool(archived),
            ),
        )
        return _fetchone_dict(cur) or {}


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
        "provider_id",
    }

    text_fields = {
        "first_name",
        "last_name",
        "preferred_name",
        "gender",
        "ethnicity",
        "nhs_number",
        "local_id_number",
        "photo_url",
    }

    updates: list[str] = []
    params: list[Any] = []

    clean_payload = {key: value for key, value in dict(payload or {}).items() if key in allowed_fields}

    if "home_id" in clean_payload:
        new_home_id = _normalise_int(clean_payload.get("home_id"))
        clean_payload["home_id"] = new_home_id
        if new_home_id and "provider_id" not in clean_payload:
            clean_payload["provider_id"] = _get_home_provider_id(conn, new_home_id)

    for key, value in clean_payload.items():
        if key in text_fields:
            value = _clean_text(value)

        if key in {"home_id", "primary_keyworker_id", "provider_id"}:
            value = _normalise_int(value)

        if key == "placement_status":
            value = _normalise_status(value)

        if key == "summary_risk_level":
            value = _normalise_risk_level(value)

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
        return _fetchone_dict(cur)


def get_section(conn, young_person_id: int, table_name: str) -> dict[str, Any] | None:
    allowed_tables = {
        "young_person_communication_profile",
        "young_person_education_profile",
        "young_person_health_profile",
        "young_person_identity_profile",
        "young_person_legal_status",
        "young_person_formulations",
    }

    if table_name not in allowed_tables:
        raise ValueError("Unsupported young person section")

    if not _table_exists(conn, table_name):
        return None

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT *
            FROM {table_name}
            WHERE young_person_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        )
        return _fetchone_dict(cur)


def get_young_person_overview(conn, young_person_id: int) -> dict[str, Any]:
    person = get_young_person_by_id(conn, young_person_id)
    if not person:
        return {}

    overview: dict[str, Any] = {"young_person": person}

    section_tables = {
        "communication_profile": "young_person_communication_profile",
        "education_profile": "young_person_education_profile",
        "health_profile": "young_person_health_profile",
        "identity_profile": "young_person_identity_profile",
        "legal_status": "young_person_legal_status",
        "formulation": "young_person_formulations",
    }

    for key, table_name in section_tables.items():
        overview[key] = get_section(conn, young_person_id, table_name)

    overview["contacts"] = list_contacts(conn, young_person_id)
    overview["alerts"] = list_alerts(conn, young_person_id)

    count_tables = {
        "daily_note_count": "daily_notes",
        "incident_count": "incidents",
        "active_risk_count": "risk_assessments",
        "active_support_plan_count": "support_plans",
    }

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        for output_key, table_name in count_tables.items():
            if not _table_exists(conn, table_name):
                overview[output_key] = 0
                continue

            archived_filter = ""
            if table_name in {"risk_assessments", "support_plans"}:
                archived_filter = "AND COALESCE(archived, FALSE) = FALSE"

            cur.execute(
                f"""
                SELECT COUNT(*)::int AS count
                FROM {table_name}
                WHERE young_person_id = %s
                {archived_filter}
                """,
                (young_person_id,),
            )
            row = _fetchone_dict(cur)
            overview[output_key] = int((row or {}).get("count") or 0)

    return overview


def _upsert_single_section(
    conn,
    *,
    table_name: str,
    young_person_id: int,
    provider_id: int | None,
    payload: dict[str, Any],
    fields: list[str],
) -> dict[str, Any]:
    if not _table_exists(conn, table_name):
        raise ValueError(f"Missing table: {table_name}")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT id
            FROM {table_name}
            WHERE young_person_id = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (young_person_id,),
        )
        existing = _fetchone_dict(cur)

        values = [_clean_text(payload.get(field)) for field in fields]

        if existing:
            set_sql = ", ".join([f"{field} = %s" for field in fields])
            cur.execute(
                f"""
                UPDATE {table_name}
                SET {set_sql},
                    provider_id = COALESCE(%s, provider_id),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (*values, provider_id, existing["id"]),
            )
        else:
            insert_columns = ["provider_id", "young_person_id", *fields]
            placeholders = ", ".join(["%s"] * len(insert_columns))
            cur.execute(
                f"""
                INSERT INTO {table_name} ({", ".join(insert_columns)})
                VALUES ({placeholders})
                RETURNING *
                """,
                (provider_id, young_person_id, *values),
            )

        return _fetchone_dict(cur) or {}


def upsert_communication_profile(
    conn,
    *,
    young_person_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    provider_id = _get_young_person_provider_id(conn, young_person_id)
    return _upsert_single_section(
        conn,
        table_name="young_person_communication_profile",
        young_person_id=young_person_id,
        provider_id=provider_id,
        payload=payload,
        fields=[
            "neurodiversity_summary",
            "communication_style",
            "sensory_profile",
            "processing_needs",
            "signs_of_distress",
            "what_helps",
            "what_to_avoid",
            "routines_and_predictability",
            "visual_support_needs",
        ],
    )


def upsert_education_profile(
    conn,
    *,
    young_person_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    provider_id = _get_young_person_provider_id(conn, young_person_id)

    if not _table_exists(conn, "young_person_education_profile"):
        raise ValueError("Missing table: young_person_education_profile")

    attendance_baseline = payload.get("attendance_baseline")
    if attendance_baseline in ("", None):
        attendance_baseline = None

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id
            FROM young_person_education_profile
            WHERE young_person_id = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (young_person_id,),
        )
        existing = _fetchone_dict(cur)

        values = (
            _clean_text(payload.get("school_name")),
            _clean_text(payload.get("year_group")),
            _clean_text(payload.get("education_status")),
            _clean_text(payload.get("sen_status")),
            _clean_text(payload.get("ehcp_details")),
            _clean_text(payload.get("designated_teacher")),
            attendance_baseline,
            _clean_text(payload.get("pep_status")),
            _clean_text(payload.get("support_summary")),
        )

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
                    provider_id = COALESCE(%s, provider_id),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (*values, provider_id, existing["id"]),
            )
        else:
            cur.execute(
                """
                INSERT INTO young_person_education_profile (
                    provider_id,
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
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (provider_id, young_person_id, *values),
            )

        return _fetchone_dict(cur) or {}


def upsert_health_profile(
    conn,
    *,
    young_person_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    provider_id = _get_young_person_provider_id(conn, young_person_id)
    return _upsert_single_section(
        conn,
        table_name="young_person_health_profile",
        young_person_id=young_person_id,
        provider_id=provider_id,
        payload=payload,
        fields=[
            "gp_name",
            "gp_contact",
            "dentist_name",
            "dentist_contact",
            "optician_name",
            "optician_contact",
            "allergies",
            "diagnoses",
            "mental_health_summary",
            "medication_summary",
            "consent_notes",
        ],
    )


def upsert_identity_profile(
    conn,
    *,
    young_person_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    provider_id = _get_young_person_provider_id(conn, young_person_id)
    return _upsert_single_section(
        conn,
        table_name="young_person_identity_profile",
        young_person_id=young_person_id,
        provider_id=provider_id,
        payload=payload,
        fields=[
            "religion_or_faith",
            "cultural_identity",
            "first_language",
            "dietary_needs",
            "interests",
            "strengths_summary",
            "what_matters_to_me",
            "important_dates",
        ],
    )


def upsert_legal_status(
    conn,
    *,
    young_person_id: int,
    created_by: int | None = None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    provider_id = _get_young_person_provider_id(conn, young_person_id)

    legal_status = _required_text(
        payload.get("legal_status"),
        field_name="legal_status",
        default="Looked after child",
    )
    effective_from = payload.get("effective_from")
    if not effective_from:
        raise ValueError("effective_from is required")

    effective_to = payload.get("effective_to")
    is_current = _normalise_bool(payload.get("is_current"), True)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        if is_current:
            cur.execute(
                """
                UPDATE young_person_legal_status
                SET is_current = FALSE,
                    updated_at = NOW()
                WHERE young_person_id = %s
                  AND COALESCE(is_current, FALSE) = TRUE
                """,
                (young_person_id,),
            )

        cur.execute(
            """
            SELECT id
            FROM young_person_legal_status
            WHERE young_person_id = %s
              AND effective_from IS NOT DISTINCT FROM %s
              AND order_type IS NOT DISTINCT FROM %s
              AND legal_status IS NOT DISTINCT FROM %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (
                young_person_id,
                effective_from,
                _clean_text(payload.get("order_type")),
                legal_status,
            ),
        )
        existing = _fetchone_dict(cur)

        values = (
            legal_status,
            _clean_text(payload.get("order_type")),
            _clean_text(payload.get("order_details")),
            _clean_text(payload.get("delegated_authority_details")),
            _clean_text(payload.get("restrictions_text")),
            _clean_text(payload.get("consent_arrangements")),
            effective_from,
            effective_to,
            is_current,
            provider_id,
        )

        if existing:
            cur.execute(
                """
                UPDATE young_person_legal_status
                SET
                    legal_status = %s,
                    order_type = %s,
                    order_details = %s,
                    delegated_authority_details = %s,
                    restrictions_text = %s,
                    consent_arrangements = %s,
                    effective_from = %s,
                    effective_to = %s,
                    is_current = %s,
                    provider_id = COALESCE(%s, provider_id),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (*values, existing["id"]),
            )
        else:
            cur.execute(
                """
                INSERT INTO young_person_legal_status (
                    provider_id,
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
                    created_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    provider_id,
                    young_person_id,
                    legal_status,
                    _clean_text(payload.get("order_type")),
                    _clean_text(payload.get("order_details")),
                    _clean_text(payload.get("delegated_authority_details")),
                    _clean_text(payload.get("restrictions_text")),
                    _clean_text(payload.get("consent_arrangements")),
                    effective_from,
                    effective_to,
                    is_current,
                    _normalise_int(created_by),
                ),
            )

        return _fetchone_dict(cur) or {}


def upsert_formulation(
    conn,
    *,
    young_person_id: int,
    created_by: int | None = None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    provider_id = _get_young_person_provider_id(conn, young_person_id)
    review_date = payload.get("review_date")
    is_current = _normalise_bool(payload.get("is_current"), True)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        if is_current:
            cur.execute(
                """
                UPDATE young_person_formulations
                SET is_current = FALSE,
                    updated_at = NOW()
                WHERE young_person_id = %s
                  AND COALESCE(is_current, FALSE) = TRUE
                """,
                (young_person_id,),
            )

        cur.execute(
            """
            SELECT id
            FROM young_person_formulations
            WHERE young_person_id = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (young_person_id,),
        )
        existing = _fetchone_dict(cur)

        values = (
            _clean_text(payload.get("presenting_needs")),
            _clean_text(payload.get("developmental_context")),
            _clean_text(payload.get("trauma_context")),
            _clean_text(payload.get("neurodevelopmental_context")),
            _clean_text(payload.get("relational_context")),
            _clean_text(payload.get("meaning_of_behaviour")),
            _clean_text(payload.get("known_triggers")),
            _clean_text(payload.get("early_signs_of_distress")),
            _clean_text(payload.get("protective_factors")),
            _clean_text(payload.get("what_helps")),
            _clean_text(payload.get("what_adults_should_avoid")),
            _clean_text(payload.get("regulation_strategies")),
            _clean_text(payload.get("child_voice_summary")),
            review_date,
            is_current,
            provider_id,
        )

        if existing:
            cur.execute(
                """
                UPDATE young_person_formulations
                SET
                    presenting_needs = %s,
                    developmental_context = %s,
                    trauma_context = %s,
                    neurodevelopmental_context = %s,
                    relational_context = %s,
                    meaning_of_behaviour = %s,
                    known_triggers = %s,
                    early_signs_of_distress = %s,
                    protective_factors = %s,
                    what_helps = %s,
                    what_adults_should_avoid = %s,
                    regulation_strategies = %s,
                    child_voice_summary = %s,
                    review_date = %s,
                    is_current = %s,
                    provider_id = COALESCE(%s, provider_id),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (*values, existing["id"]),
            )
        else:
            cur.execute(
                """
                INSERT INTO young_person_formulations (
                    provider_id,
                    young_person_id,
                    presenting_needs,
                    developmental_context,
                    trauma_context,
                    neurodevelopmental_context,
                    relational_context,
                    meaning_of_behaviour,
                    known_triggers,
                    early_signs_of_distress,
                    protective_factors,
                    what_helps,
                    what_adults_should_avoid,
                    regulation_strategies,
                    child_voice_summary,
                    review_date,
                    is_current,
                    created_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    provider_id,
                    young_person_id,
                    values[0],
                    values[1],
                    values[2],
                    values[3],
                    values[4],
                    values[5],
                    values[6],
                    values[7],
                    values[8],
                    values[9],
                    values[10],
                    values[11],
                    values[12],
                    review_date,
                    is_current,
                    _normalise_int(created_by),
                ),
            )

        return _fetchone_dict(cur) or {}


def list_contacts(conn, young_person_id: int) -> list[dict[str, Any]]:
    if not _table_exists(conn, "young_person_contacts"):
        return []

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT *
            FROM young_person_contacts
            WHERE young_person_id = %s
            ORDER BY
                COALESCE(is_parental_responsibility_holder, FALSE) DESC,
                COALESCE(is_approved_contact, FALSE) DESC,
                full_name ASC,
                id DESC
            """,
            (young_person_id,),
        )
        return _fetchall_dicts(cur)


def add_contact(
    conn,
    *,
    young_person_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    person = _get_young_person_home_and_provider(conn, young_person_id)
    if not person:
        raise ValueError("Young person not found")

    provider_id = _normalise_int(person.get("provider_id"))

    contact_type = _required_text(payload.get("contact_type"), field_name="contact_type", default="family")
    full_name = _required_text(payload.get("full_name"), field_name="full_name")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO young_person_contacts (
                provider_id,
                young_person_id,
                contact_type,
                full_name,
                relationship_to_young_person,
                relationship_to_child,
                phone,
                phone_number,
                email,
                address,
                is_parental_responsibility_holder,
                is_approved_contact,
                is_restricted_contact,
                supervision_level,
                notes,
                contact_notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                provider_id,
                young_person_id,
                contact_type,
                full_name,
                _clean_text(payload.get("relationship_to_young_person")),
                _clean_text(payload.get("relationship_to_young_person")),
                _clean_text(payload.get("phone")),
                _clean_text(payload.get("phone")),
                _clean_text(payload.get("email")),
                _clean_text(payload.get("address")),
                _normalise_bool(payload.get("is_parental_responsibility_holder")),
                _normalise_bool(payload.get("is_approved_contact")),
                _normalise_bool(payload.get("is_restricted_contact")),
                _clean_text(payload.get("supervision_level")),
                _clean_text(payload.get("notes")),
                _clean_text(payload.get("notes")),
            ),
        )
        return _fetchone_dict(cur) or {}


def update_contact(conn, contact_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    allowed_fields = {
        "contact_type",
        "full_name",
        "relationship_to_young_person",
        "phone",
        "email",
        "address",
        "is_parental_responsibility_holder",
        "is_approved_contact",
        "is_restricted_contact",
        "supervision_level",
        "notes",
    }

    alias_fields = {
        "relationship_to_young_person": "relationship_to_child",
        "phone": "phone_number",
        "notes": "contact_notes",
    }

    updates: list[str] = []
    params: list[Any] = []

    for key, value in dict(payload or {}).items():
        if key not in allowed_fields:
            continue

        if key in {
            "is_parental_responsibility_holder",
            "is_approved_contact",
            "is_restricted_contact",
        }:
            value = _normalise_bool(value)
        else:
            value = _clean_text(value)

        updates.append(f"{key} = %s")
        params.append(value)

        alias = alias_fields.get(key)
        if alias:
            updates.append(f"{alias} = %s")
            params.append(value)

    if not updates:
        return None

    updates.append("updated_at = NOW()")
    params.append(contact_id)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE young_person_contacts
            SET {", ".join(updates)}
            WHERE id = %s
            RETURNING *
            """,
            tuple(params),
        )
        return _fetchone_dict(cur)


def list_alerts(conn, young_person_id: int) -> list[dict[str, Any]]:
    if not _table_exists(conn, "young_person_alerts"):
        return []

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT *
            FROM young_person_alerts
            WHERE young_person_id = %s
            ORDER BY
                COALESCE(is_active, TRUE) DESC,
                COALESCE(review_date, CURRENT_DATE) ASC,
                created_at DESC,
                id DESC
            """,
            (young_person_id,),
        )
        return _fetchall_dicts(cur)


def add_alert(
    conn,
    *,
    young_person_id: int,
    created_by: int | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    person = _get_young_person_home_and_provider(conn, young_person_id)
    if not person:
        raise ValueError("Young person not found")

    provider_id = _normalise_int(person.get("provider_id"))

    title = _required_text(payload.get("title"), field_name="title")
    alert_type = _required_text(payload.get("alert_type"), field_name="alert_type", default="general")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO young_person_alerts (
                provider_id,
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
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                provider_id,
                young_person_id,
                alert_type,
                title,
                _clean_text(payload.get("description")),
                _normalise_alert_severity(payload.get("severity")),
                _normalise_bool(payload.get("is_active"), True),
                _normalise_bool(payload.get("show_globally"), True),
                payload.get("review_date"),
                _normalise_int(created_by),
            ),
        )
        return _fetchone_dict(cur) or {}