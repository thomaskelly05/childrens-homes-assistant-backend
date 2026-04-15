from __future__ import annotations

import os
import smtplib
from email.mime.text import MIMEText
from typing import Any

from psycopg2.extras import RealDictCursor

from services.ai_service import generate_ai_response
from services.report_fact_service import get_or_create_report_snapshot


def _fetch_one(conn, query: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        row = cur.fetchone()
        return dict(row) if row else None


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


def _build_light_preview_from_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    facts = snapshot.get("facts_json") or {}
    signals = snapshot.get("signals_json") or {}
    metrics = snapshot.get("metrics_json") or {}

    return {
        "report_type": snapshot.get("report_type"),
        "period_start": snapshot.get("period_start"),
        "period_end": snapshot.get("period_end"),
        "homes": (facts.get("homes") or []),
        "metrics": metrics,
        "strengths": signals.get("strengths") or [],
        "concerns": signals.get("concerns") or [],
        "recommendations": signals.get("recommendations") or [],
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
    generated_by: int | None = None,
    force_refresh: bool = False,
) -> dict[str, Any]:
    snapshot = get_or_create_report_snapshot(
        conn,
        report_type="monthly",
        home_id=home_id,
        start_date=start_date,
        end_date=end_date,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        provider_id=provider_id,
        generated_by=generated_by,
        force_refresh=force_refresh,
    )
    return snapshot.get("facts_json") or {}


def build_reg45_context(
    conn,
    *,
    home_id: int | None,
    start_date: str,
    end_date: str,
    access_level: str | None = None,
    allowed_home_ids: list[int] | None = None,
    provider_id: int | None = None,
    generated_by: int | None = None,
    force_refresh: bool = False,
) -> dict[str, Any]:
    snapshot = get_or_create_report_snapshot(
        conn,
        report_type="reg45",
        home_id=home_id,
        start_date=start_date,
        end_date=end_date,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        provider_id=provider_id,
        generated_by=generated_by,
        force_refresh=force_refresh,
    )
    return snapshot.get("facts_json") or {}


def build_yearly_report_context(
    conn,
    *,
    home_id: int | None,
    start_date: str,
    end_date: str,
    access_level: str | None = None,
    allowed_home_ids: list[int] | None = None,
    provider_id: int | None = None,
    generated_by: int | None = None,
    force_refresh: bool = False,
) -> dict[str, Any]:
    snapshot = get_or_create_report_snapshot(
        conn,
        report_type="yearly",
        home_id=home_id,
        start_date=start_date,
        end_date=end_date,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        provider_id=provider_id,
        generated_by=generated_by,
        force_refresh=force_refresh,
    )
    return snapshot.get("facts_json") or {}


def preview_report_snapshot(
    conn,
    *,
    report_type: str,
    home_id: int | None,
    start_date: str,
    end_date: str,
    access_level: str | None,
    allowed_home_ids: list[int] | None,
    provider_id: int | None,
    generated_by: int | None,
    force_refresh: bool = False,
) -> dict[str, Any]:
    snapshot = get_or_create_report_snapshot(
        conn,
        report_type=report_type,
        home_id=home_id,
        start_date=start_date,
        end_date=end_date,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        provider_id=provider_id,
        generated_by=generated_by,
        force_refresh=force_refresh,
    )
    return {
        "snapshot": snapshot,
        "preview": _build_light_preview_from_snapshot(snapshot),
    }


def _build_report_prompt(report_type: str, facts: dict[str, Any], signals: dict[str, Any], metrics: dict[str, Any]) -> str:
    report_type = str(report_type or "").strip().lower()

    if report_type == "reg45":
        instruction = """
Create a Regulation 45 style report.

Required structure:
1. Introduction and reporting period
2. Overview of the home
3. Experiences, progress and outcomes for children
4. Education, health and emotional wellbeing
5. Relationships, contact and identity
6. Safeguarding, missing episodes, incidents and behaviour patterns
7. Quality of care, staffing and management oversight
8. Strengths and positives
9. Areas for development
10. Recommendations
"""
    elif report_type == "yearly":
        instruction = """
Create a yearly overview report.

Required structure:
1. Year in review
2. Outcomes for children
3. Positive developments and strengths
4. Safeguarding and risk themes
5. Staffing, practice and operational themes
6. Compliance and management oversight
7. Key patterns over time
8. Strategic recommendations
"""
    else:
        instruction = """
Create a monthly management report.

Required structure:
1. Period overview
2. Experiences and outcomes for children
3. Safeguarding and risk overview
4. Staffing and operational themes
5. Compliance and management oversight
6. Strengths and positives
7. Concerns or gaps
8. Priority actions
"""

    return f"""
You are writing a professional children's home report.

{instruction}

Rules:
- stay evidence-based
- use warm, professional, child-centred language
- include strengths and positive outcomes as well as concerns
- do not invent incidents, patterns or statistics
- state clearly where evidence is limited
- use the local signals as guidance, but only where they are supported by the facts

Metrics:
{metrics}

Local strengths / concerns / recommendations:
{signals}

Structured facts:
{facts}
""".strip()


def _generate_report_text(report_type: str, facts: dict[str, Any], signals: dict[str, Any], metrics: dict[str, Any]) -> str:
    prompt = _build_report_prompt(report_type, facts, signals, metrics)
    return generate_ai_response(
        message=prompt,
        context={
            "facts": facts,
            "signals": signals,
            "metrics": metrics,
        },
    )


def _store_generated_report(
    conn,
    *,
    report_type: str,
    start_date: str,
    end_date: str,
    report_text: str,
    triggered_by_user_id: int | None,
) -> dict[str, Any] | None:
    review_month = None
    if report_type == "monthly" and start_date and len(start_date) >= 7:
        review_month = f"{start_date[:7]}-01"

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


def _store_delivery_log(
    conn,
    *,
    report_snapshot_id: int | None,
    ai_generated_report_id: int | None,
    report_type: str,
    home_id: int | None,
    provider_id: int | None,
    start_date: str,
    end_date: str,
    email_to: str,
    delivery_status: str,
    delivery_error: str | None,
    triggered_by: int | None,
) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO report_delivery_log (
                report_snapshot_id,
                ai_generated_report_id,
                report_type,
                home_id,
                provider_id,
                period_start,
                period_end,
                email_to,
                delivery_status,
                delivery_error,
                triggered_by,
                delivered_at,
                created_at
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                CASE WHEN %s = 'delivered' THEN NOW() ELSE NULL END,
                NOW()
            )
            RETURNING *
            """,
            (
                report_snapshot_id,
                ai_generated_report_id,
                report_type,
                home_id,
                provider_id,
                start_date,
                end_date,
                email_to,
                delivery_status,
                delivery_error,
                triggered_by,
                delivery_status,
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
    force_refresh: bool = False,
) -> dict[str, Any]:
    report_type = str(report_type or "").strip().lower()
    if report_type not in {"monthly", "reg45", "yearly"}:
        raise ValueError("Unsupported report_type")

    snapshot = get_or_create_report_snapshot(
        conn,
        report_type=report_type,
        home_id=home_id,
        start_date=start_date,
        end_date=end_date,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        provider_id=provider_id,
        generated_by=triggered_by_user_id,
        force_refresh=force_refresh,
    )

    facts = snapshot.get("facts_json") or {}
    signals = snapshot.get("signals_json") or {}
    metrics = snapshot.get("metrics_json") or {}

    report_text = _generate_report_text(report_type, facts, signals, metrics)

    resolved_email = email_to
    if not resolved_email and home_id:
        home = _get_home_row(conn, home_id)
        resolved_email = (home or {}).get("manager_email")

    if not resolved_email:
        raise ValueError("No manager email available for report delivery")

    stored_report = None
    delivery_log = None

    try:
        send_email(
            to_email=resolved_email,
            subject=f"{report_type.upper()} report | {start_date} to {end_date}",
            body=report_text,
        )

        stored_report = _store_generated_report(
            conn,
            report_type=report_type,
            start_date=start_date,
            end_date=end_date,
            report_text=report_text,
            triggered_by_user_id=triggered_by_user_id,
        )

        delivery_log = _store_delivery_log(
            conn,
            report_snapshot_id=snapshot.get("id"),
            ai_generated_report_id=(stored_report or {}).get("id"),
            report_type=report_type,
            home_id=home_id,
            provider_id=provider_id,
            start_date=start_date,
            end_date=end_date,
            email_to=resolved_email,
            delivery_status="delivered",
            delivery_error=None,
            triggered_by=triggered_by_user_id,
        )

        conn.commit()
    except Exception as exc:
        conn.rollback()
        try:
            _store_delivery_log(
                conn,
                report_snapshot_id=snapshot.get("id"),
                ai_generated_report_id=None,
                report_type=report_type,
                home_id=home_id,
                provider_id=provider_id,
                start_date=start_date,
                end_date=end_date,
                email_to=resolved_email or "",
                delivery_status="failed",
                delivery_error=str(exc),
                triggered_by=triggered_by_user_id,
            )
            conn.commit()
        except Exception:
            conn.rollback()
        raise

    return {
        "report_type": report_type,
        "home_id": home_id,
        "start_date": start_date,
        "end_date": end_date,
        "email_to": resolved_email,
        "triggered_by_user_id": triggered_by_user_id,
        "delivered": True,
        "snapshot_id": snapshot.get("id"),
        "stored_report_id": (stored_report or {}).get("id"),
        "delivery_log_id": (delivery_log or {}).get("id"),
    }
