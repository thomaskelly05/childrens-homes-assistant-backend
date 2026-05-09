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


def _month_key(now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    return now.strftime("%Y-%m")


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


def _runtime_usage_lines() -> list[str]:
    # Current in-memory usage is useful immediately. Persistent per-user usage can be added
    # as the runtime is wired through every AI product.
    usage = runtime.usage("default")
    tasks = usage.get("tasks") or {}
    lines = [
        "In-memory runtime usage snapshot:",
        f"- Requests: {usage.get('requests', 0)}",
        f"- Estimated tokens: {usage.get('tokens', 0):,}",
    ]
    if tasks:
        lines.append("- Task breakdown:")
        for task, count in sorted(tasks.items(), key=lambda item: item[0]):
            lines.append(f"  - {task}: {count}")
    else:
        lines.append("- Task breakdown: no runtime task usage recorded yet")
    return lines


def _mail_usage_lines(conn) -> list[str]:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*) AS total_messages,
                    COUNT(*) FILTER (WHERE external_delivery_status = 'sent') AS external_sent,
                    COUNT(*) FILTER (WHERE external_delivery_status = 'failed') AS external_failed,
                    COUNT(*) FILTER (WHERE ai_flags ? 'safeguarding_review') AS safeguarding_flagged,
                    COUNT(*) FILTER (WHERE ai_flags ? 'tone_review') AS tone_flagged,
                    COUNT(*) FILTER (WHERE ai_flags ? 'actions_likely') AS action_flagged
                FROM indicare_mail_messages
                WHERE created_at >= date_trunc('month', now()) - interval '1 month'
                  AND created_at < date_trunc('month', now())
                """
            )
            row = cur.fetchone() or {}
        return [
            "IndiCare Mail usage:",
            f"- Total messages: {row.get('total_messages', 0)}",
            f"- External emails sent: {row.get('external_sent', 0)}",
            f"- External delivery failures: {row.get('external_failed', 0)}",
            f"- Safeguarding flagged emails: {row.get('safeguarding_flagged', 0)}",
            f"- Tone flagged emails: {row.get('tone_flagged', 0)}",
            f"- Action/follow-up flagged emails: {row.get('action_flagged', 0)}",
        ]
    except Exception:
        return ["IndiCare Mail usage: not available yet"]


def _notes_usage_lines(conn) -> list[str]:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name IN ('ai_notes', 'ai_note_versions')
                """
            )
            tables = {row["table_name"] for row in cur.fetchall()}
            if "ai_notes" not in tables:
                return ["I-Notes usage: table not available yet"]
            cur.execute(
                """
                SELECT COUNT(*) AS notes_created
                FROM ai_notes
                WHERE created_at >= date_trunc('month', now()) - interval '1 month'
                  AND created_at < date_trunc('month', now())
                """
            )
            row = cur.fetchone() or {}
        return ["I-Notes usage:", f"- Notes created: {row.get('notes_created', 0)}"]
    except Exception:
        return ["I-Notes usage: not available yet"]


def build_monthly_usage_report(conn, report_month: str) -> tuple[str, str]:
    subject = f"IndiCare AI monthly usage overview - {report_month}"
    body_lines = [
        f"IndiCare AI monthly usage overview for {report_month}",
        "",
        "This report is designed to help monitor usage, cost exposure and adoption across IndiCare AI products.",
        "",
        *_runtime_usage_lines(),
        "",
        *_notes_usage_lines(conn),
        "",
        *_mail_usage_lines(conn),
        "",
        "Cost-control notes:",
        "- The AI runtime governor is active for task routing, caching and soft limits.",
        "- Persistent per-user/per-home AI usage logging should be the next upgrade as more products route through the runtime.",
        "- External mail sending depends on SMTP configuration.",
        "",
        "Recipient:",
        f"- {REPORT_TO}",
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
        # Send after the first day of the month begins, then table guard prevents duplicates.
        if now.day == 1 and now.hour >= 7:
            await asyncio.to_thread(send_monthly_usage_report)
            await asyncio.sleep(60 * 60 * 24)
        await asyncio.sleep(60 * 30)
