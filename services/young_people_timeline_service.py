from __future__ import annotations

from typing import Any

from psycopg2.extras import RealDictCursor


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _fetchall_dicts(cur) -> list[dict[str, Any]]:
    rows = cur.fetchall() or []
    return [dict(row) for row in rows]


def get_young_person_timeline(
    conn,
    *,
    young_person_id: int,
    date_from: Any = None,
    date_to: Any = None,
    record_type: str = "",
    search: str = "",
    limit: int = 250,
) -> list[dict[str, Any]]:
    """
    Unified timeline across key young person records.

    Returns rows shaped like:
    {
        "record_type": "incident",
        "source_id": 123,
        "title": "...",
        "summary": "...",
        "subtitle": "...",
        "event_at": datetime,
        "record_date": date,
        "created_at": datetime,
    }
    """

    clean_record_type = _safe_string(record_type).lower()
    clean_search = _safe_string(search)

    params: list[Any] = [young_person_id]

    date_from_sql = ""
    if date_from:
        date_from_sql = "AND timeline.event_at::date >= %s"
        params.append(date_from)

    date_to_sql = ""
    if date_to:
        date_to_sql = "AND timeline.event_at::date <= %s"
        params.append(date_to)

    record_type_sql = ""
    if clean_record_type:
        record_type_sql = "AND timeline.record_type = %s"
        params.append(clean_record_type)

    search_sql = ""
    if clean_search:
        search_sql = """
        AND (
            COALESCE(timeline.title, '') ILIKE %s
            OR COALESCE(timeline.summary, '') ILIKE %s
            OR COALESCE(timeline.subtitle, '') ILIKE %s
        )
        """
        like = f"%{clean_search}%"
        params.extend([like, like, like])

    params.append(limit)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            WITH timeline AS (
                SELECT
                    'incident'::text AS record_type,
                    i.id AS source_id,
                    COALESCE(NULLIF(i.incident_type, ''), 'Incident') AS title,
                    COALESCE(NULLIF(i.description, ''), NULLIF(i.outcome, ''), 'Incident recorded') AS summary,
                    CONCAT_WS(
                        ' · ',
                        NULLIF(i.location, ''),
                        NULLIF(i.severity, ''),
                        CASE WHEN COALESCE(i.safeguarding_flag, FALSE) THEN 'Safeguarding flagged' ELSE NULL END
                    ) AS subtitle,
                    COALESCE(i.incident_datetime, i.created_at) AS event_at,
                    i.incident_datetime::date AS record_date,
                    i.created_at
                FROM incidents i
                WHERE i.young_person_id = %s

                UNION ALL

                SELECT
                    'daily_note'::text AS record_type,
                    dn.id AS source_id,
                    CONCAT(
                        'Daily note',
                        CASE WHEN dn.shift_type IS NOT NULL AND dn.shift_type <> '' THEN ' - ' || dn.shift_type ELSE '' END
                    ) AS title,
                    COALESCE(
                        NULLIF(dn.positives, ''),
                        NULLIF(dn.activities, ''),
                        NULLIF(dn.behaviour_update, ''),
                        NULLIF(dn.young_person_voice, ''),
                        'Daily note recorded'
                    ) AS summary,
                    CONCAT_WS(
                        ' · ',
                        NULLIF(dn.mood, ''),
                        NULLIF(dn.significance, ''),
                        NULLIF(dn.workflow_status, '')
                    ) AS subtitle,
                    COALESCE(dn.note_date::timestamp, dn.created_at) AS event_at,
                    dn.note_date AS record_date,
                    dn.created_at
                FROM daily_notes dn
                WHERE dn.young_person_id = %s

                UNION ALL

                SELECT
                    'health_record'::text AS record_type,
                    hr.id AS source_id,
                    COALESCE(NULLIF(hr.title, ''), NULLIF(hr.record_type, ''), 'Health record') AS title,
                    COALESCE(NULLIF(hr.summary, ''), NULLIF(hr.outcome, ''), 'Health record added') AS summary,
                    CONCAT_WS(
                        ' · ',
                        NULLIF(hr.professional_name, ''),
                        CASE WHEN COALESCE(hr.follow_up_required, FALSE) THEN 'Follow-up required' ELSE NULL END,
                        CASE WHEN hr.next_action_date IS NOT NULL THEN 'Next action ' || hr.next_action_date::text ELSE NULL END
                    ) AS subtitle,
                    COALESCE(hr.event_datetime, hr.created_at) AS event_at,
                    hr.event_datetime::date AS record_date,
                    hr.created_at
                FROM health_records hr
                WHERE hr.young_person_id = %s

                UNION ALL

                SELECT
                    'education_record'::text AS record_type,
                    er.id AS source_id,
                    COALESCE(NULLIF(er.provision_name, ''), 'Education record') AS title,
                    COALESCE(
                        NULLIF(er.achievement_note, ''),
                        NULLIF(er.issue_raised, ''),
                        NULLIF(er.learning_engagement, ''),
                        'Education record added'
                    ) AS summary,
                    CONCAT_WS(
                        ' · ',
                        NULLIF(er.attendance_status, ''),
                        NULLIF(er.professional_involved, '')
                    ) AS subtitle,
                    COALESCE(er.record_date::timestamp, er.created_at) AS event_at,
                    er.record_date AS record_date,
                    er.created_at
                FROM education_records er
                WHERE er.young_person_id = %s

                UNION ALL

                SELECT
                    'family_contact'::text AS record_type,
                    fcr.id AS source_id,
                    COALESCE(NULLIF(fcr.contact_person, ''), 'Family contact') AS title,
                    COALESCE(
                        NULLIF(fcr.child_voice, ''),
                        NULLIF(fcr.post_contact_presentation, ''),
                        NULLIF(fcr.concerns, ''),
                        'Family contact recorded'
                    ) AS summary,
                    CONCAT_WS(
                        ' · ',
                        NULLIF(fcr.contact_type, ''),
                        NULLIF(fcr.supervision_level, ''),
                        CASE WHEN COALESCE(fcr.follow_up_required, FALSE) THEN 'Follow-up required' ELSE NULL END
                    ) AS subtitle,
                    COALESCE(fcr.contact_datetime, fcr.created_at) AS event_at,
                    fcr.contact_datetime::date AS record_date,
                    fcr.created_at
                FROM family_contact_records fcr
                WHERE fcr.young_person_id = %s

                UNION ALL

                SELECT
                    'keywork_session'::text AS record_type,
                    ks.id AS source_id,
                    COALESCE(NULLIF(ks.topic, ''), 'Keywork session') AS title,
                    COALESCE(
                        NULLIF(ks.summary, ''),
                        NULLIF(ks.reflective_analysis, ''),
                        NULLIF(ks.actions_agreed, ''),
                        'Keywork session recorded'
                    ) AS summary,
                    CONCAT_WS(
                        ' · ',
                        NULLIF(ks.status, ''),
                        NULLIF(ks.workflow_status, ''),
                        CASE WHEN ks.next_session_date IS NOT NULL THEN 'Next session ' || ks.next_session_date::text ELSE NULL END
                    ) AS subtitle,
                    COALESCE(ks.session_date::timestamp, ks.created_at) AS event_at,
                    ks.session_date AS record_date,
                    ks.created_at
                FROM keywork_sessions ks
                WHERE ks.young_person_id = %s

                UNION ALL

                SELECT
                    'risk_assessment'::text AS record_type,
                    ra.id AS source_id,
                    COALESCE(NULLIF(ra.title, ''), NULLIF(ra.category, ''), 'Risk assessment') AS title,
                    COALESCE(
                        NULLIF(ra.concern_summary, ''),
                        NULLIF(ra.response_actions, ''),
                        NULLIF(ra.current_controls, ''),
                        'Risk assessment recorded'
                    ) AS summary,
                    CONCAT_WS(
                        ' · ',
                        NULLIF(ra.severity, ''),
                        NULLIF(ra.likelihood, ''),
                        NULLIF(ra.status, ''),
                        CASE WHEN ra.review_date IS NOT NULL THEN 'Review ' || ra.review_date::text ELSE NULL END
                    ) AS subtitle,
                    COALESCE(ra.updated_at, ra.created_at) AS event_at,
                    ra.review_date AS record_date,
                    ra.created_at
                FROM risk_assessments ra
                WHERE ra.young_person_id = %s

                UNION ALL

                SELECT
                    'chronology_event'::text AS record_type,
                    ce.id AS source_id,
                    COALESCE(NULLIF(ce.title, ''), NULLIF(ce.category, ''), 'Chronology event') AS title,
                    COALESCE(NULLIF(ce.summary, ''), 'Chronology event recorded') AS summary,
                    CONCAT_WS(
                        ' · ',
                        NULLIF(ce.category, ''),
                        NULLIF(ce.subcategory, ''),
                        NULLIF(ce.significance, ''),
                        NULLIF(ce.event_status, '')
                    ) AS subtitle,
                    COALESCE(ce.event_datetime, ce.created_at) AS event_at,
                    ce.event_datetime::date AS record_date,
                    ce.created_at
                FROM chronology_events ce
                WHERE ce.young_person_id = %s
            )
            SELECT
                timeline.record_type,
                timeline.source_id,
                timeline.title,
                timeline.summary,
                timeline.subtitle,
                timeline.event_at,
                timeline.record_date,
                timeline.created_at
            FROM timeline
            WHERE 1=1
            {date_from_sql}
            {date_to_sql}
            {record_type_sql}
            {search_sql}
            ORDER BY timeline.event_at DESC NULLS LAST, timeline.created_at DESC NULLS LAST
            LIMIT %s
            """,
            (
                young_person_id,  # incidents
                young_person_id,  # daily notes
                young_person_id,  # health
                young_person_id,  # education
                young_person_id,  # family
                young_person_id,  # keywork
                young_person_id,  # risk
                young_person_id,  # chronology
                *params[1:],      # filters + limit, excluding first duplicate young_person_id
            ),
        )

        return _fetchall_dicts(cur)
