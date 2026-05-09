from __future__ import annotations

import asyncio
import os
import smtplib
import ssl
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Any

from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection
from services.ai_runtime.runtime import runtime

REPORT_TO = os.getenv("INDICARE_AI_USAGE_REPORT_TO", "Thomas.kelly@indicare.co.uk")
REPORT_FROM = os.getenv("INDICARE_MAIL_SMTP_FROM") or os.getenv("INDICARE_MAIL_DEFAULT_FROM") or "no-reply@indicare.ai"
TARGET_REVENUE_PER_HOME = int(os.getenv("INDICARE_TARGET_REVENUE_PER_HOME", "100"))
TARGET_AI_COST_PER_HOME = int(os.getenv("INDICARE_TARGET_AI_COST_PER_HOME", "15"))

TABLE_SQL = """
CREATE TABLE IF NOT EXISTS ai_usage_monthly_reports (
    report_month TEXT PRIMARY KEY,
    sent_to TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
"""


def _previous_month_key(now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    year = now.year
    month = now.month - 1
    if month == 0:
        year -= 1
        month = 12
    return f"{year:04d}-{month:02d}"


def _smtp_configured() -> bool:
    return bool(os.getenv("INDICARE_MAIL_SMTP_HOST") and REPORT_FROM)


def _send_email(subject: str, body: str) -> tuple[str, str | None]:
    if not _smtp_configured():
        return "not_configured", "SMTP is not configured. Set INDICARE_MAIL_SMTP_HOST and INDICARE_MAIL_SMTP_FROM."

    host = os.getenv("INDICARE_MAIL_SMTP_HOST", "")
    port = int(os.getenv("INDICARE_MAIL_SMTP_PORT", "587"))
    username = os.getenv("INDICARE_MAIL_SMTP_USERNAME")
    password = os.getenv("INDICARE_MAIL_SMTP_PASSWORD")
    use_ssl = os.getenv("INDICARE_MAIL_SMTP_SSL", "false").lower() in {"1", "true", "yes"}

    message = EmailMessage()
    message["From"] = REPORT_FROM
    message["To"] = REPORT_TO
    message["Subject"] = subject
    message.set_content(body)

    try:
        if use_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context, timeout=20) as smtp:
                if username and password:
                    smtp.login(username, password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=20) as smtp:
                smtp.starttls(context=ssl.create_default_context())
                if username and password:
                    smtp.login(username, password)
                smtp.send_message(message)
        return "sent", None
    except Exception as exc:
        return "failed", str(exc)


def _ensure_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(TABLE_SQL)
    conn.commit()


def _already_sent(conn, report_month: str) -> bool:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT status FROM ai_usage_monthly_reports WHERE report_month = %s LIMIT 1",
            (report_month,),
        )
        row = cur.fetchone()
    return bool(row and row.get("status") == "sent")


def _record_report(conn, report_month: str, subject: str, body: str, status: str, error: str | None) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ai_usage_monthly_reports (report_month, sent_to, subject, body, status, error, sent_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, CASE WHEN %s = 'sent' THEN now() ELSE NULL END, now())
            ON CONFLICT (report_month) DO UPDATE SET
                sent_to = EXCLUDED.sent_to,
                subject = EXCLUDED.subject,
                body = EXCLUDED.body,
                status = EXCLUDED.status,
                error = EXCLUDED.error,
                sent_at = CASE WHEN EXCLUDED.status = 'sent' THEN now() ELSE ai_usage_monthly_reports.sent_at END,
                updated_at = now()
            """,
            (report_month, REPORT_TO, subject, body, status, error, status),
        )
    conn.commit()


def _table_exists(conn, table_name: str) -> bool:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = %s
                ) AS exists
                """,
                (table_name,),
            )
            row = cur.fetchone()
            return bool(row and row.get("exists"))
    except Exception:
        return False


def _scalar(conn, sql: str, params: tuple[Any, ...] = ()) -> int:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            row = cur.fetchone() or {}
            value = next(iter(row.values()), 0)
            return int(value or 0)
    except Exception:
        return 0


def _runtime_usage_snapshot() -> dict[str, Any]:
    usage = runtime.usage("default")
    tokens = int(usage.get("tokens", 0) or 0)
    requests = int(usage.get("requests", 0) or 0)
    # Conservative rough estimate while persistent pricing is not wired.
    estimated_cost_gbp = round((tokens / 1_000_000) * 0.50, 2)
    return {
        "requests": requests,
        "tokens": tokens,
        "tasks": usage.get("tasks") or {},
        "estimated_cost_gbp": estimated_cost_gbp,
    }


def _mail_stats(conn) -> dict[str, int]:
    if not _table_exists(conn, "indicare_mail_messages"):
        return {}
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*) AS total_messages,
                    COUNT(DISTINCT sender_user_id) AS active_senders,
                    COUNT(*) FILTER (WHERE external_delivery_status = 'sent') AS external_sent,
                    COUNT(*) FILTER (WHERE external_delivery_status = 'failed') AS external_failed,
                    COUNT(*) FILTER (WHERE ai_flags ? 'safeguarding_review') AS safeguarding_flagged,
                    COUNT(*) FILTER (WHERE ai_flags ? 'tone_review') AS tone_flagged,
                    COUNT(*) FILTER (WHERE ai_flags ? 'actions_likely') AS action_flagged,
                    COUNT(*) FILTER (WHERE ai_flags ? 'chronology_relevant') AS chronology_flagged
                FROM indicare_mail_messages
                WHERE created_at >= date_trunc('month', now()) - interval '1 month'
                  AND created_at < date_trunc('month', now())
                """
            )
            return dict(cur.fetchone() or {})
    except Exception:
        return {}


def _notes_stats(conn) -> dict[str, int]:
    if not _table_exists(conn, "ai_notes"):
        return {}
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*) AS notes_created,
                    COUNT(DISTINCT created_by) AS active_note_users
                FROM ai_notes
                WHERE created_at >= date_trunc('month', now()) - interval '1 month'
                  AND created_at < date_trunc('month', now())
                """
            )
            return dict(cur.fetchone() or {})
    except Exception:
        return {}


def _user_stats(conn) -> dict[str, int]:
    if not _table_exists(conn, "users"):
        return {}
    return {
        "total_users": _scalar(conn, "SELECT COUNT(*) FROM users"),
        "active_users": _scalar(conn, "SELECT COUNT(*) FROM users WHERE COALESCE(is_active, TRUE) IS TRUE"),
    }


def _home_stats(conn) -> dict[str, int]:
    candidates = ["homes", "children_homes", "care_homes"]
    for table in candidates:
        if _table_exists(conn, table):
            return {"total_homes": _scalar(conn, f"SELECT COUNT(*) FROM {table}"), "source_table": table}
    return {"total_homes": 0, "source_table": "not_available"}


def _month_activity_count(conn, table: str, column: str = "created_at") -> int:
    if not _table_exists(conn, table):
        return 0
    return _scalar(
        conn,
        f"""
        SELECT COUNT(*) FROM {table}
        WHERE {column} >= date_trunc('month', now()) - interval '1 month'
          AND {column} < date_trunc('month', now())
        """,
    )


def _section(title: str, lines: list[str]) -> list[str]:
    return [title, "-" * len(title), *lines, ""]


def _ai_usage_cost_report(runtime_usage: dict[str, Any], notes: dict[str, Any], mail: dict[str, Any], homes: dict[str, Any]) -> list[str]:
    home_count = int(homes.get("total_homes") or 0)
    estimated_revenue = home_count * TARGET_REVENUE_PER_HOME
    estimated_ai_cost = float(runtime_usage.get("estimated_cost_gbp") or 0)
    cost_per_home = round(estimated_ai_cost / home_count, 2) if home_count else 0
    tasks = runtime_usage.get("tasks") or {}
    lines = [
        f"Homes counted: {home_count} ({homes.get('source_table')})",
        f"Estimated monthly revenue at £{TARGET_REVENUE_PER_HOME}/home: £{estimated_revenue:,}",
        f"AI runtime requests: {runtime_usage.get('requests', 0):,}",
        f"Estimated runtime tokens: {runtime_usage.get('tokens', 0):,}",
        f"Estimated AI runtime cost: £{estimated_ai_cost:.2f}",
        f"Estimated AI cost per home: £{cost_per_home:.2f} / target £{TARGET_AI_COST_PER_HOME}",
        f"I-Notes created: {notes.get('notes_created', 0)}",
        f"Mail messages: {mail.get('total_messages', 0)}",
        f"External mail sent: {mail.get('external_sent', 0)}",
    ]
    if tasks:
        lines.append("Task breakdown:")
        for task, count in sorted(tasks.items(), key=lambda item: item[0]):
            lines.append(f"  - {task}: {count}")
    else:
        lines.append("Task breakdown: no runtime task usage recorded yet")
    return _section("1. AI Usage + Cost Report", lines)


def _home_health_report(conn, notes: dict[str, Any], mail: dict[str, Any]) -> list[str]:
    incidents = _month_activity_count(conn, "incidents") + _month_activity_count(conn, "young_people_incidents")
    daily_notes = _month_activity_count(conn, "daily_notes") + _month_activity_count(conn, "young_people_daily_notes")
    handovers = _month_activity_count(conn, "handovers")
    safeguarding_signals = int(mail.get("safeguarding_flagged") or 0)
    tone_flags = int(mail.get("tone_flagged") or 0)
    action_flags = int(mail.get("action_flagged") or 0)
    lines = [
        f"Incident records detected: {incidents}",
        f"Daily notes detected: {daily_notes}",
        f"Handovers detected: {handovers}",
        f"I-Notes created: {notes.get('notes_created', 0)}",
        f"Safeguarding-related mail flags: {safeguarding_signals}",
        f"Tone pressure flags in mail: {tone_flags}",
        f"Action/follow-up flags in mail: {action_flags}",
        "Interpretation:",
        "  - Rising safeguarding/tone/action flags may indicate increased home pressure or documentation load.",
        "  - Low notes/docs activity may indicate adoption risk or underuse of support tools.",
    ]
    return _section("2. Home Health Report", lines)


def _engagement_churn_report(users: dict[str, Any], notes: dict[str, Any], mail: dict[str, Any], homes: dict[str, Any]) -> list[str]:
    active_note_users = int(notes.get("active_note_users") or 0)
    active_mail_users = int(mail.get("active_senders") or 0)
    total_users = int(users.get("total_users") or 0)
    total_homes = int(homes.get("total_homes") or 0)
    engaged_users = max(active_note_users, active_mail_users)
    engagement_rate = round((engaged_users / total_users) * 100, 1) if total_users else 0
    churn_risk = "low"
    if total_homes and engaged_users == 0:
        churn_risk = "high"
    elif total_users and engagement_rate < 20:
        churn_risk = "medium"
    lines = [
        f"Total users: {total_users}",
        f"Active users: {users.get('active_users', 0)}",
        f"Active I-Notes users: {active_note_users}",
        f"Active Mail senders: {active_mail_users}",
        f"Observed engagement rate: {engagement_rate}%",
        f"Churn/adoption risk: {churn_risk.upper()}",
        "Suggested action:",
        "  - If engagement is low, offer onboarding focused on I-Notes, Docs templates and Mail AI review.",
    ]
    return _section("3. Engagement + Churn Report", lines)


def _safeguarding_escalation_report(conn, mail: dict[str, Any]) -> list[str]:
    risk_records = _month_activity_count(conn, "risk_assessments") + _month_activity_count(conn, "young_people_risk")
    chronology_records = _month_activity_count(conn, "chronology") + _month_activity_count(conn, "young_people_chronology")
    safeguarding_mail = int(mail.get("safeguarding_flagged") or 0)
    chronology_mail = int(mail.get("chronology_flagged") or 0)
    external_failures = int(mail.get("external_failed") or 0)
    lines = [
        f"Safeguarding-flagged mail: {safeguarding_mail}",
        f"Chronology-relevant mail: {chronology_mail}",
        f"Risk records detected: {risk_records}",
        f"Chronology records detected: {chronology_records}",
        f"External email delivery failures: {external_failures}",
        "Risk lens:",
        "  - Safeguarding and chronology flags should be reviewed for missed follow-up or evidence gaps.",
        "  - External delivery failures may affect multi-agency communication and should be checked.",
    ]
    return _section("4. Safeguarding Escalation Report", lines)


def _executive_overview_report(runtime_usage: dict[str, Any], users: dict[str, Any], homes: dict[str, Any], notes: dict[str, Any], mail: dict[str, Any]) -> list[str]:
    total_homes = int(homes.get("total_homes") or 0)
    revenue = total_homes * TARGET_REVENUE_PER_HOME
    estimated_ai_cost = float(runtime_usage.get("estimated_cost_gbp") or 0)
    estimated_margin_after_ai = revenue - estimated_ai_cost
    key_flags = []
    if int(mail.get("safeguarding_flagged") or 0) > 0:
        key_flags.append(f"{mail.get('safeguarding_flagged')} safeguarding mail flags")
    if int(mail.get("external_failed") or 0) > 0:
        key_flags.append(f"{mail.get('external_failed')} external mail failures")
    if int(runtime_usage.get("requests") or 0) == 0:
        key_flags.append("AI runtime usage not yet persistently routed from all products")
    lines = [
        f"Homes: {total_homes}",
        f"Users: {users.get('total_users', 0)}",
        f"Estimated revenue: £{revenue:,}",
        f"Estimated AI cost: £{estimated_ai_cost:.2f}",
        f"Estimated margin after AI runtime cost: £{estimated_margin_after_ai:,.2f}",
        f"I-Notes created: {notes.get('notes_created', 0)}",
        f"Mail messages: {mail.get('total_messages', 0)}",
        "Key flags: " + (", ".join(key_flags) if key_flags else "none detected"),
        "Founder focus for next month:",
        "  1. Route every AI call through the AI runtime for persistent cost visibility.",
        "  2. Improve adoption tracking by home/provider.",
        "  3. Add persistent per-user token/cost logging.",
        "  4. Review flagged safeguarding and chronology communications.",
    ]
    return _section("5. Executive Overview Report", lines)


def build_monthly_usage_report(conn, report_month: str) -> tuple[str, str]:
    runtime_usage = _runtime_usage_snapshot()
    mail = _mail_stats(conn)
    notes = _notes_stats(conn)
    users = _user_stats(conn)
    homes = _home_stats(conn)
    subject = f"IndiCare Founder Intelligence Report - {report_month}"
    body_lines = [
        f"IndiCare Founder Intelligence Report for {report_month}",
        "",
        "This monthly pack combines the five key reports you asked for:",
        "1. AI Usage + Cost",
        "2. Home Health",
        "3. Engagement + Churn",
        "4. Safeguarding Escalation",
        "5. Executive Overview",
        "",
        *_ai_usage_cost_report(runtime_usage, notes, mail, homes),
        *_home_health_report(conn, notes, mail),
        *_engagement_churn_report(users, notes, mail, homes),
        *_safeguarding_escalation_report(conn, mail),
        *_executive_overview_report(runtime_usage, users, homes, notes, mail),
        "Report controls",
        "---------------",
        f"Recipient: {REPORT_TO}",
        "Disable monthly email with INDICARE_DISABLE_MONTHLY_USAGE_EMAIL=true",
        "Override recipient with INDICARE_AI_USAGE_REPORT_TO",
        "Override target revenue/cost with INDICARE_TARGET_REVENUE_PER_HOME and INDICARE_TARGET_AI_COST_PER_HOME",
    ]
    return subject, "\n".join(body_lines)


def send_monthly_usage_report(report_month: str | None = None, *, force: bool = False) -> dict[str, Any]:
    report_month = report_month or _previous_month_key()
    conn = get_db_connection()
    try:
        _ensure_table(conn)
        if not force and _already_sent(conn, report_month):
            return {"ok": True, "status": "already_sent", "report_month": report_month, "sent_to": REPORT_TO}
        subject, body = build_monthly_usage_report(conn, report_month)
        status, error = _send_email(subject, body)
        _record_report(conn, report_month, subject, body, status, error)
        return {"ok": status == "sent", "status": status, "error": error, "report_month": report_month, "sent_to": REPORT_TO}
    finally:
        conn.close()


async def monthly_usage_report_loop() -> None:
    if os.getenv("INDICARE_DISABLE_MONTHLY_USAGE_EMAIL", "false").lower() in {"1", "true", "yes"}:
        return

    while True:
        now = datetime.now(timezone.utc)
        if now.day == 1 and now.hour >= 7:
            await asyncio.to_thread(send_monthly_usage_report)
            await asyncio.sleep(60 * 60 * 24)
        await asyncio.sleep(60 * 30)
