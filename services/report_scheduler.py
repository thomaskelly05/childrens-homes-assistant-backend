from __future__ import annotations

import os
import smtplib
from email.mime.text import MIMEText
from typing import Any

from psycopg2.extras import RealDictCursor

from services.ai_service import generate_ai_response


def _fetch_one(conn, query: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        row = cur.fetchone()
        return dict(row) if row else None


def _fetch_all(conn, query: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        rows = cur.fetchall() or []
        return [dict(row) for row in rows]


def _safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except Exception:
        return None


def _safe_int_list(value: Any) -> list[int]:
    if not isinstance(value, list):
        return []
    result: list[int] = []
    for item in value:
        parsed = _safe_int(item)
        if parsed is not None:
            result.append(parsed)
    return result


def _resolve_home_ids(
    *,
    home_id: int | None,
    access_level: str | None,
    allowed_home_ids: list[int] | None,
) -> list[int]:
    if (access_level or "").strip().lower() == "provider":
        ids = _safe_int_list(allowed_home_ids or [])
        if ids:
            return ids
        return [home_id] if home_id else []
    return [home_id] if home_id else []


def _get_home_row(conn, home_id: int) -> dict[str, Any] | None:
    return _fetch_one(
        conn,
        """
        SELECT
            id,
            name,
            name AS home_name,
            manager_email,
            provider_id
        FROM homes
        WHERE id = %s
        LIMIT 1
        """,
        (home_id,),
    )


def _get_home_rows(conn, home_ids: list[int]) -> list[dict[str, Any]]:
    if not home_ids:
        return []

    return _fetch_all(
        conn,
        """
        SELECT
            id,
            name,
            name AS home_name,
            manager_email,
            provider_id
        FROM homes
        WHERE id = ANY(%s)
        ORDER BY name ASC, id ASC
        """,
        (home_ids,),
    )


def _build_children_outcomes_summary(
    conn,
    home_ids: list[int],
    start_date: str,
    end_date: str,
) -> list[dict[str, Any]]:
    if not home_ids:
        return []

    return _fetch_all(
        conn,
        """
        SELECT
            yp.home_id,
            yp.id AS young_person_id,
            COALESCE(
                yp.preferred_name,
                CONCAT_WS(' ', yp.first_name, yp.last_name),
                'Young person'
            ) AS young_person_name,
            yp.placement_status,
            yp.summary_risk_level,
            COUNT(DISTINCT er.id) AS education_records_count,
            COUNT(DISTINCT hr.id) AS health_records_count,
            COUNT(DISTINCT fcr.id) AS family_contact_records_count,
            COUNT(DISTINCT ar.id) AS achievement_records_count,
            COUNT(DISTINCT i.id) AS incidents_count,
            COUNT(DISTINCT me.id) AS missing_episodes_count,
            COUNT(DISTINCT ks.id) AS keywork_sessions_count
        FROM young_people yp
        LEFT JOIN education_records er
            ON er.young_person_id = yp.id
           AND er.record_date BETWEEN %s AND %s
        LEFT JOIN health_records hr
            ON hr.young_person_id = yp.id
           AND hr.event_datetime::date BETWEEN %s AND %s
        LEFT JOIN family_contact_records fcr
            ON fcr.young_person_id = yp.id
           AND fcr.contact_datetime::date BETWEEN %s AND %s
        LEFT JOIN achievement_records ar
            ON ar.young_person_id = yp.id
           AND ar.achievement_date BETWEEN %s AND %s
           AND COALESCE(ar.archived, FALSE) = FALSE
        LEFT JOIN incidents i
            ON i.young_person_id = yp.id
           AND i.incident_datetime::date BETWEEN %s AND %s
        LEFT JOIN missing_episodes me
            ON me.young_person_id = yp.id
           AND me.start_datetime::date BETWEEN %s AND %s
        LEFT JOIN keywork_sessions ks
            ON ks.young_person_id = yp.id
           AND ks.session_date BETWEEN %s AND %s
        WHERE yp.home_id = ANY(%s)
          AND COALESCE(yp.archived, FALSE) = FALSE
        GROUP BY
            yp.home_id,
            yp.id,
            yp.preferred_name,
            yp.first_name,
            yp.last_name,
            yp.placement_status,
            yp.summary_risk_level
        ORDER BY yp.home_id ASC, young_person_name ASC
        """,
        (
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            home_ids,
        ),
    )


def _build_incident_summary(
    conn,
    home_ids: list[int],
    start_date: str,
    end_date: str,
) -> list[dict[str, Any]]:
    if not home_ids:
        return []

    return _fetch_all(
        conn,
        """
        SELECT
            home_id,
            incident_type,
            COUNT(*) AS count
        FROM incidents
        WHERE home_id = ANY(%s)
          AND incident_datetime::date BETWEEN %s AND %s
        GROUP BY home_id, incident_type
        ORDER BY home_id ASC, count DESC, incident_type ASC
        """,
        (home_ids, start_date, end_date),
    )


def _build_safeguarding_summary(
    conn,
    home_ids: list[int],
    start_date: str,
    end_date: str,
) -> list[dict[str, Any]]:
    if not home_ids:
        return []

    return _fetch_all(
        conn,
        """
        SELECT
            home_id,
            safeguarding_category,
            status,
            COUNT(*) AS count
        FROM safeguarding_records
        WHERE home_id = ANY(%s)
          AND concern_datetime::date BETWEEN %s AND %s
        GROUP BY home_id, safeguarding_category, status
        ORDER BY home_id ASC, count DESC, safeguarding_category ASC
        """,
        (home_ids, start_date, end_date),
    )


def _build_compliance_summary(
    conn,
    home_ids: list[int],
    start_date: str,
    end_date: str,
) -> list[dict[str, Any]]:
    if not home_ids:
        return []

    return _fetch_all(
        conn,
        """
        SELECT
            home_id,
            status,
            severity,
            COUNT(*) AS count
        FROM compliance_items
        WHERE home_id = ANY(%s)
          AND (
            due_date BETWEEN %s AND %s
            OR updated_at::date BETWEEN %s AND %s
          )
        GROUP BY home_id, status, severity
        ORDER BY home_id ASC, count DESC, status ASC, severity ASC
        """,
        (home_ids, start_date, end_date, start_date, end_date),
    )


def _build_staffing_summary(
    conn,
    home_ids: list[int],
    start_date: str,
    end_date: str,
) -> dict[str, Any]:
    if not home_ids:
        return {
            "staff_assignments": [],
            "staff_status": [],
            "roster_shifts": [],
            "staff_shifts": [],
            "checkins": [],
        }

    staff_assignments = _fetch_all(
        conn,
        """
        SELECT
            sha.home_id,
            COUNT(DISTINCT sha.staff_id) AS count
        FROM staff_home_assignments sha
        WHERE sha.home_id = ANY(%s)
        GROUP BY sha.home_id
        ORDER BY sha.home_id ASC
        """,
        (home_ids,),
    )

    staff_status = _fetch_all(
        conn,
        """
        SELECT
            sha.home_id,
            COALESCE(s.status, 'unknown') AS status,
            COUNT(DISTINCT s.id) AS count
        FROM staff_home_assignments sha
        INNER JOIN staff s
            ON s.id = sha.staff_id
        WHERE sha.home_id = ANY(%s)
        GROUP BY sha.home_id, COALESCE(s.status, 'unknown')
        ORDER BY sha.home_id ASC, count DESC, status ASC
        """,
        (home_ids,),
    )

    roster_shifts = _fetch_all(
        conn,
        """
        SELECT
            rs.home_id,
            COALESCE(rs.status, 'unknown') AS status,
            COUNT(*) AS count
        FROM roster_shifts rs
        WHERE rs.home_id = ANY(%s)
          AND rs.shift_date BETWEEN %s AND %s
        GROUP BY rs.home_id, COALESCE(rs.status, 'unknown')
        ORDER BY rs.home_id ASC, count DESC, status ASC
        """,
        (home_ids, start_date, end_date),
    )

    staff_shifts = _fetch_all(
        conn,
        """
        SELECT
            ss.home_id,
            COALESCE(ss.status, 'unknown') AS status,
            COUNT(*) AS count
        FROM staff_shifts ss
        WHERE ss.home_id = ANY(%s)
          AND ss.shift_date BETWEEN %s AND %s
        GROUP BY ss.home_id, COALESCE(ss.status, 'unknown')
        ORDER BY ss.home_id ASC, count DESC, status ASC
        """,
        (home_ids, start_date, end_date),
    )

    checkins = _fetch_all(
        conn,
        """
        SELECT
            sc.home_id,
            COUNT(*) AS count
        FROM staff_checkins sc
        WHERE sc.home_id = ANY(%s)
          AND sc.created_at::date BETWEEN %s AND %s
        GROUP BY sc.home_id
        ORDER BY sc.home_id ASC
        """,
        (home_ids, start_date, end_date),
    )

    return {
        "staff_assignments": staff_assignments,
        "staff_status": staff_status,
        "roster_shifts": roster_shifts,
        "staff_shifts": staff_shifts,
        "checkins": checkins,
    }


def _build_supervision_summary(
    conn,
    home_ids: list[int],
    start_date: str,
    end_date: str,
) -> dict[str, Any]:
    if not home_ids:
        return {
            "supervision_notes": [],
            "supervision_submissions": [],
            "supervision_summaries": [],
        }

    supervision_notes = _fetch_all(
        conn,
        """
        SELECT
            sn.home_id,
            COUNT(*) AS count
        FROM supervision_notes sn
        WHERE sn.home_id = ANY(%s)
          AND sn.created_at::date BETWEEN %s AND %s
        GROUP BY sn.home_id
        ORDER BY sn.home_id ASC
        """,
        (home_ids, start_date, end_date),
    )

    supervision_submissions = _fetch_all(
        conn,
        """
        SELECT
            ss.home_id,
            COALESCE(ss.status, 'unknown') AS status,
            COUNT(*) AS count
        FROM supervision_submissions ss
        WHERE ss.home_id = ANY(%s)
          AND ss.created_at::date BETWEEN %s AND %s
        GROUP BY ss.home_id, COALESCE(ss.status, 'unknown')
        ORDER BY ss.home_id ASC, count DESC, status ASC
        """,
        (home_ids, start_date, end_date),
    )

    supervision_summaries = _fetch_all(
        conn,
        """
        SELECT
            ss.home_id,
            COUNT(*) AS count
        FROM supervision_summaries ss
        WHERE ss.home_id = ANY(%s)
          AND ss.created_at::date BETWEEN %s AND %s
        GROUP BY ss.home_id
        ORDER BY ss.home_id ASC
        """,
        (home_ids, start_date, end_date),
    )

    return {
        "supervision_notes": supervision_notes,
        "supervision_submissions": supervision_submissions,
        "supervision_summaries": supervision_summaries,
    }


def _build_positive_indicators(
    conn,
    home_ids: list[int],
    start_date: str,
    end_date: str,
) -> dict[str, Any]:
    if not home_ids:
        return {
            "achievement_counts": [],
            "keywork_counts": [],
            "family_contact_counts": [],
            "daily_notes_counts": [],
        }

    achievements = _fetch_all(
        conn,
        """
        SELECT
            home_id,
            COUNT(*) AS count
        FROM achievement_records
        WHERE home_id = ANY(%s)
          AND achievement_date BETWEEN %s AND %s
          AND COALESCE(archived, FALSE) = FALSE
        GROUP BY home_id
        ORDER BY home_id ASC
        """,
        (home_ids, start_date, end_date),
    )

    keywork = _fetch_all(
        conn,
        """
        SELECT
            home_id,
            COUNT(*) AS count
        FROM keywork_sessions
        WHERE home_id = ANY(%s)
          AND session_date BETWEEN %s AND %s
        GROUP BY home_id
        ORDER BY home_id ASC
        """,
        (home_ids, start_date, end_date),
    )

    family_contact = _fetch_all(
        conn,
        """
        SELECT
            home_id,
            COUNT(*) AS count
        FROM family_contact_records
        WHERE home_id = ANY(%s)
          AND contact_datetime::date BETWEEN %s AND %s
        GROUP BY home_id
        ORDER BY home_id ASC
        """,
        (home_ids, start_date, end_date),
    )

    daily_notes = _fetch_all(
        conn,
        """
        SELECT
            home_id,
            COUNT(*) AS count
        FROM daily_notes
        WHERE home_id = ANY(%s)
          AND note_date BETWEEN %s AND %s
        GROUP BY home_id
        ORDER BY home_id ASC
        """,
        (home_ids, start_date, end_date),
    )

    return {
        "achievement_counts": achievements,
        "keywork_counts": keywork,
        "family_contact_counts": family_contact,
        "daily_notes_counts": daily_notes,
    }


def _build_management_summary(
    conn,
    home_ids: list[int],
    start_date: str,
    end_date: str,
) -> dict[str, Any]:
    if not home_ids:
        return {
            "manager_updates": [],
            "manager_actions": [],
            "monthly_reviews": [],
            "review_meetings": [],
        }

    manager_updates = _fetch_all(
        conn,
        """
        SELECT
            home_id,
            COALESCE(status, 'unknown') AS status,
            COUNT(*) AS count
        FROM manager_updates
        WHERE home_id = ANY(%s)
          AND created_at::date BETWEEN %s AND %s
        GROUP BY home_id, COALESCE(status, 'unknown')
        ORDER BY home_id ASC, count DESC, status ASC
        """,
        (home_ids, start_date, end_date),
    )

    manager_actions = _fetch_all(
        conn,
        """
        SELECT
            home_id,
            COALESCE(status, 'unknown') AS status,
            COUNT(*) AS count
        FROM manager_actions
        WHERE home_id = ANY(%s)
          AND created_at::date BETWEEN %s AND %s
        GROUP BY home_id, COALESCE(status, 'unknown')
        ORDER BY home_id ASC, count DESC, status ASC
        """,
        (home_ids, start_date, end_date),
    )

    monthly_reviews = _fetch_all(
        conn,
        """
        SELECT
            home_id,
            COALESCE(status, 'unknown') AS status,
            COUNT(*) AS count
        FROM monthly_reviews
        WHERE home_id = ANY(%s)
          AND (
            review_month BETWEEN %s AND %s
            OR created_at::date BETWEEN %s AND %s
          )
        GROUP BY home_id, COALESCE(status, 'unknown')
        ORDER BY home_id ASC, count DESC, status ASC
        """,
        (home_ids, start_date, end_date, start_date, end_date),
    )

    review_meetings = _fetch_all(
        conn,
        """
        SELECT
            home_id,
            COUNT(*) AS count
        FROM review_meetings
        WHERE home_id = ANY(%s)
          AND created_at::date BETWEEN %s AND %s
        GROUP BY home_id
        ORDER BY home_id ASC
        """,
        (home_ids, start_date, end_date),
    )

    return {
        "manager_updates": manager_updates,
        "manager_actions": manager_actions,
        "monthly_reviews": monthly_reviews,
        "review_meetings": review_meetings,
    }


def build_monthly_report_context(
    conn,
    *,
    home_id: int | None,
    start_date: str,
    end_date: str,
    access_level: str | None = None,
    allowed_home_ids: list[int] | None = None,
    provider_id: int | None = None,
) -> dict[str, Any]:
    home_ids = _resolve_home_ids(
        home_id=home_id,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
    )

    return {
        "report_type": "monthly",
        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },
        "access_level": access_level,
        "provider_id": provider_id,
        "home_ids": home_ids,
        "homes": _get_home_rows(conn, home_ids),
        "children_outcomes": _build_children_outcomes_summary(conn, home_ids, start_date, end_date),
        "incident_summary": _build_incident_summary(conn, home_ids, start_date, end_date),
        "safeguarding_summary": _build_safeguarding_summary(conn, home_ids, start_date, end_date),
        "compliance_summary": _build_compliance_summary(conn, home_ids, start_date, end_date),
        "staffing_summary": _build_staffing_summary(conn, home_ids, start_date, end_date),
        "supervision_summary": _build_supervision_summary(conn, home_ids, start_date, end_date),
        "management_summary": _build_management_summary(conn, home_ids, start_date, end_date),
        "positive_indicators": _build_positive_indicators(conn, home_ids, start_date, end_date),
    }


def build_reg45_context(
    conn,
    *,
    home_id: int | None,
    start_date: str,
    end_date: str,
    access_level: str | None = None,
    allowed_home_ids: list[int] | None = None,
    provider_id: int | None = None,
) -> dict[str, Any]:
    base = build_monthly_report_context(
        conn,
        home_id=home_id,
        start_date=start_date,
        end_date=end_date,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        provider_id=provider_id,
    )
    base["report_type"] = "reg45"
    return base


def build_yearly_report_context(
    conn,
    *,
    home_id: int | None,
    start_date: str,
    end_date: str,
    access_level: str | None = None,
    allowed_home_ids: list[int] | None = None,
    provider_id: int | None = None,
) -> dict[str, Any]:
    base = build_monthly_report_context(
        conn,
        home_id=home_id,
        start_date=start_date,
        end_date=end_date,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        provider_id=provider_id,
    )
    base["report_type"] = "yearly"
    return base


def _build_report_prompt(report_type: str, context: dict[str, Any]) -> str:
    report_type = str(report_type or "").strip().lower()

    if report_type == "reg45":
        instruction = """
Create a Regulation 45 style report.

Required focus:
- experiences and outcomes for children
- progress, strengths and positive developments
- education, health and emotional wellbeing
- safeguarding, incidents and risk patterns
- quality of care and effectiveness of staff practice
- management monitoring and oversight
- strengths, shortfalls and clear recommendations

Do not focus only on risk. Balance concerns with progress, nurture, achievement, stability and protective factors.
"""
    elif report_type == "yearly":
        instruction = """
Create a yearly overview report.

Required focus:
- patterns and themes across the year
- outcomes for children
- strengths, positives and improvement over time
- safeguarding and risk themes
- staffing and operational patterns
- management and quality assurance themes
- strategic recommendations for the year ahead
"""
    else:
        instruction = """
Create a monthly management report.

Required focus:
- current experiences and outcomes for children
- strengths and positive indicators
- safeguarding and current risks
- staffing, supervision and operational themes
- compliance issues and management oversight
- priority actions for the next period
"""

    return f"""
You are writing a professional children's home report.

{instruction}

Rules:
- stay evidence-based
- use warm, professional, child-centred language
- include positives and strengths as well as concerns
- do not invent incidents, outcomes, trends or statistics
- identify gaps where relevant
- state clearly where evidence is limited
- write in a structured, manager-ready format

Structured context:
{context}
""".strip()


def _generate_report_text(report_type: str, context: dict[str, Any]) -> str:
    prompt = _build_report_prompt(report_type, context)
    return generate_ai_response(
        message=prompt,
        context=context,
    )


def _smtp_settings() -> tuple[str, int, str, str, str]:
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME", "")
    password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("REPORTS_FROM_EMAIL", username or "noreply@indicare.local")
    return host, port, username, password, from_email


def send_email(*, to_email: str, subject: str, body: str) -> None:
    host, port, username, password, from_email = _smtp_settings()

    if not to_email:
        raise ValueError("Recipient email is required")

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    with smtplib.SMTP(host, port) as server:
        server.starttls()
        if username and password:
            server.login(username, password)
        server.send_message(msg)


def _store_generated_report(
    conn,
    *,
    home_id: int | None,
    report_type: str,
    start_date: str,
    end_date: str,
    report_text: str,
    triggered_by_user_id: int | None,
) -> dict[str, Any] | None:
    review_month = None
    if report_type == "monthly":
        review_month = f"{start_date[:7]}-01" if start_date and len(start_date) >= 7 else None

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO ai_generated_reports (
                young_person_id,
                report_type,
                title,
                review_month,
                report_text,
                status,
                generated_by,
                created_at,
                updated_at
            )
            VALUES (
                NULL,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                NOW(),
                NOW()
            )
            RETURNING *
            """,
            (
                report_type,
                f"{report_type.upper()} report | {start_date} to {end_date}",
                review_month,
                report_text,
                "generated",
                triggered_by_user_id,
            ),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def send_scheduled_report_now(
    conn,
    *,
    report_type: str,
    home_id: int | None,
    start_date: str,
    end_date: str,
    email_to: str | None,
    access_level: str | None,
    allowed_home_ids: list[int] | None,
    provider_id: int | None,
    triggered_by_user_id: int | None,
) -> dict[str, Any]:
    report_type = str(report_type or "").strip().lower()
    if report_type not in {"monthly", "reg45", "yearly"}:
        raise ValueError("Unsupported report_type")

    if not start_date or not end_date:
        raise ValueError("start_date and end_date are required")

    if report_type == "monthly":
        context = build_monthly_report_context(
            conn,
            home_id=home_id,
            start_date=start_date,
            end_date=end_date,
            access_level=access_level,
            allowed_home_ids=allowed_home_ids,
            provider_id=provider_id,
        )
    elif report_type == "reg45":
        context = build_reg45_context(
            conn,
            home_id=home_id,
            start_date=start_date,
            end_date=end_date,
            access_level=access_level,
            allowed_home_ids=allowed_home_ids,
            provider_id=provider_id,
        )
    else:
        context = build_yearly_report_context(
            conn,
            home_id=home_id,
            start_date=start_date,
            end_date=end_date,
            access_level=access_level,
            allowed_home_ids=allowed_home_ids,
            provider_id=provider_id,
        )

    report_text = _generate_report_text(report_type, context)

    resolved_email = email_to
    if not resolved_email and home_id:
        home = _get_home_row(conn, home_id)
        resolved_email = (home or {}).get("manager_email")

    if not resolved_email:
        raise ValueError("No manager email available for report delivery")

    subject = f"{report_type.upper()} report | {start_date} to {end_date}"
    send_email(to_email=resolved_email, subject=subject, body=report_text)

    stored_report = None
    try:
        stored_report = _store_generated_report(
            conn,
            home_id=home_id,
            report_type=report_type,
            start_date=start_date,
            end_date=end_date,
            report_text=report_text,
            triggered_by_user_id=triggered_by_user_id,
        )
        conn.commit()
    except Exception:
        conn.rollback()

    return {
        "report_type": report_type,
        "home_id": home_id,
        "start_date": start_date,
        "end_date": end_date,
        "email_to": resolved_email,
        "triggered_by_user_id": triggered_by_user_id,
        "delivered": True,
        "stored_report_id": (stored_report or {}).get("id"),
    }
