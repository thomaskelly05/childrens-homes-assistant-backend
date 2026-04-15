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
        rows = cur.fetchall()
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
            COUNT(DISTINCT me.id) AS missing_episodes_count
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
        ORDER BY home_id ASC, count DESC, status ASC
        """,
        (home_ids, start_date, end_date, start_date, end_date),
    )


def _build_workforce_summary(
    conn,
    home_ids: list[int],
    start_date: str,
    end_date: str,
) -> dict[str, Any]:
    if not home_ids:
        return {"supervisions": [], "training": []}

    supervisions = _fetch_all(
        conn,
        """
        SELECT
            home_id,
            status,
            COUNT(*) AS count
        FROM supervisions
        WHERE home_id = ANY(%s)
          AND (
            due_date BETWEEN %s AND %s
            OR updated_at::date BETWEEN %s AND %s
          )
        GROUP BY home_id, status
        ORDER BY home_id ASC, count DESC, status ASC
        """,
        (home_ids, start_date, end_date, start_date, end_date),
    )

    training = _fetch_all(
        conn,
        """
        SELECT
            home_id,
            status,
            COUNT(*) AS count
        FROM training
        WHERE home_id = ANY(%s)
          AND (
            expiry_date BETWEEN %s AND %s
            OR updated_at::date BETWEEN %s AND %s
          )
        GROUP BY home_id, status
        ORDER BY home_id ASC, count DESC, status ASC
        """,
        (home_ids, start_date, end_date, start_date, end_date),
    )

    return {
        "supervisions": supervisions,
        "training": training,
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

    return {
        "achievement_counts": achievements,
        "keywork_counts": keywork,
        "family_contact_counts": family_contact,
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
        "workforce_summary": _build_workforce_summary(conn, home_ids, start_date, end_date),
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
    return {
        "report_type": "reg45",
        **build_monthly_report_context(
            conn,
            home_id=home_id,
            start_date=start_date,
            end_date=end_date,
            access_level=access_level,
            allowed_home_ids=allowed_home_ids,
            provider_id=provider_id,
        ),
    }


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
    return {
        "report_type": "yearly",
        **build_monthly_report_context(
            conn,
            home_id=home_id,
            start_date=start_date,
            end_date=end_date,
            access_level=access_level,
            allowed_home_ids=allowed_home_ids,
            provider_id=provider_id,
        ),
    }


def _build_report_prompt(report_type: str, context: dict[str, Any]) -> str:
    report_type = str(report_type or "").strip().lower()

    if report_type == "reg45":
        instruction = """
Create a Regulation 45 style report.

Focus on:
- experiences and outcomes for children
- progress, strengths and positive developments
- safeguarding, incidents and risk patterns
- effectiveness of care
- management oversight
- recommendations

Do not focus only on risk. Balance concerns with evidence of progress, nurture, achievement and stability.
"""
    elif report_type == "yearly":
        instruction = """
Create a yearly overview report.

Focus on:
- year-long patterns and trends
- outcomes for children
- positives, strengths, and improvements
- safeguarding and risk themes
- quality of care and service development
- strategic recommendations
"""
    else:
        instruction = """
Create a monthly management report.

Focus on:
- current progress and outcomes for children
- positives and strengths
- safeguarding and risks
- operational and workforce themes
- priority actions
"""

    return f"""
You are writing a professional children's home report.

{instruction}

Rules:
- stay evidence-based
- use warm, professional, child-centred language
- include positives and strengths as well as concerns
- identify gaps where relevant
- produce a clear structured report
- do not invent incidents, outcomes, or statistics
- if evidence is limited, say so plainly

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

    return {
        "report_type": report_type,
        "home_id": home_id,
        "start_date": start_date,
        "end_date": end_date,
        "email_to": resolved_email,
        "triggered_by_user_id": triggered_by_user_id,
        "delivered": True,
    }
