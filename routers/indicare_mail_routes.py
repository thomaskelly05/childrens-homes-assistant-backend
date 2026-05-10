from __future__ import annotations

import json
import os
import smtplib
import ssl
from email.message import EmailMessage
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor

from auth.session_user import get_current_user
from db.connection import get_db

router = APIRouter(
    prefix="/indicare-mail",
    tags=["IndiCare Mail"],
    dependencies=[Depends(get_current_user)],
)

TABLE_SQL = """
CREATE TABLE IF NOT EXISTS indicare_mail_messages (
    id SERIAL PRIMARY KEY,
    thread_id UUID NOT NULL,
    sender_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sender_email TEXT,
    to_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    cc_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    bcc_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    subject TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'sent',
    folder TEXT NOT NULL DEFAULT 'sent',
    ai_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    related_project_id TEXT,
    related_young_person_id TEXT,
    external_delivery_status TEXT,
    external_error TEXT,
    parent_message_id INTEGER REFERENCES indicare_mail_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
)
"""

READ_SQL = """
CREATE TABLE IF NOT EXISTS indicare_mail_user_state (
    message_id INTEGER REFERENCES indicare_mail_messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    folder TEXT NOT NULL DEFAULT 'inbox',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_starred BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, user_id)
)
"""


class MailDraft(BaseModel):
    to: list[str] = Field(default_factory=list, max_length=50)
    cc: list[str] = Field(default_factory=list, max_length=50)
    bcc: list[str] = Field(default_factory=list, max_length=50)
    subject: str = Field(default="", max_length=500)
    body: str = Field(default="", max_length=200_000)
    related_project_id: str | None = Field(default=None, max_length=120)
    related_young_person_id: str | None = Field(default=None, max_length=120)
    parent_message_id: int | None = None
    send_external: bool = True


class MailStateUpdate(BaseModel):
    is_read: bool | None = None
    is_starred: bool | None = None
    archive: bool | None = None
    delete: bool | None = None


def _ensure(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
        cur.execute(TABLE_SQL)
        cur.execute(READ_SQL)
    conn.commit()


def _user_id(current_user: dict[str, Any]) -> int:
    value = current_user.get("id") or current_user.get("user_id")
    if not value:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return int(value)


def _current_email(current_user: dict[str, Any]) -> str:
    return str(current_user.get("email") or os.getenv("INDICARE_MAIL_DEFAULT_FROM") or "no-reply@indicare.ai")


def _clean_recipients(items: list[str]) -> list[str]:
    cleaned: list[str] = []
    for item in items or []:
        value = str(item or "").strip()
        if value and value not in cleaned:
            cleaned.append(value)
    return cleaned


def _recipient_user_ids(conn, emails: list[str]) -> list[int]:
    if not emails:
        return []
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id, email FROM users WHERE lower(email) = ANY(%s)", ([email.lower() for email in emails],))
        return [int(row["id"]) for row in cur.fetchall()]


def _analyse_mail(subject: str, body: str) -> dict[str, Any]:
    text = f"{subject}\n{body}".lower()
    flags: dict[str, Any] = {"suggestions": []}
    safeguarding_terms = ["safeguarding", "risk", "harm", "missing", "police", "disclosure", "exploitation", "allegation", "restraint", "self-harm"]
    if any(term in text for term in safeguarding_terms):
        flags["safeguarding_review"] = True
        flags["suggestions"].append("Review for safeguarding, chronology, notifications and manager oversight before sending.")
    if any(term in text for term in ["angry", "furious", "unacceptable", "failed", "complaint"]):
        flags["tone_review"] = True
        flags["suggestions"].append("Tone may need to be checked for factual, professional wording.")
    if any(term in text for term in ["by tomorrow", "urgent", "asap", "follow up", "action", "deadline"]):
        flags["actions_likely"] = True
        flags["suggestions"].append("Action or follow-up may need adding to the project/task list.")
    if any(term in text for term in ["chronology", "timeline", "incident", "date", "time"]):
        flags["chronology_relevant"] = True
        flags["suggestions"].append("This email may be relevant to chronology/evidence.")
    return flags


def _smtp_configured() -> bool:
    return bool(os.getenv("INDICARE_MAIL_SMTP_HOST") and os.getenv("INDICARE_MAIL_SMTP_FROM"))


def _send_external_email(sender: str, to: list[str], cc: list[str], bcc: list[str], subject: str, body: str) -> tuple[str, str | None]:
    if not _smtp_configured():
        return "not_configured", "External SMTP is not configured. Set INDICARE_MAIL_SMTP_HOST and INDICARE_MAIL_SMTP_FROM."

    host = os.getenv("INDICARE_MAIL_SMTP_HOST", "")
    port = int(os.getenv("INDICARE_MAIL_SMTP_PORT", "587"))
    username = os.getenv("INDICARE_MAIL_SMTP_USERNAME")
    password = os.getenv("INDICARE_MAIL_SMTP_PASSWORD")
    from_email = os.getenv("INDICARE_MAIL_SMTP_FROM") or sender
    use_ssl = os.getenv("INDICARE_MAIL_SMTP_SSL", "false").lower() in {"1", "true", "yes"}

    message = EmailMessage()
    message["From"] = from_email
    message["Reply-To"] = sender
    message["To"] = ", ".join(to)
    if cc:
        message["Cc"] = ", ".join(cc)
    message["Subject"] = subject
    message.set_content(body)

    recipients = to + cc + bcc
    try:
        if use_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context, timeout=20) as smtp:
                if username and password:
                    smtp.login(username, password)
                smtp.send_message(message, to_addrs=recipients)
        else:
            with smtplib.SMTP(host, port, timeout=20) as smtp:
                smtp.starttls(context=ssl.create_default_context())
                if username and password:
                    smtp.login(username, password)
                smtp.send_message(message, to_addrs=recipients)
        return "sent", None
    except Exception as exc:
        return "failed", str(exc)


def _message_payload(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "thread_id": str(row.get("thread_id")),
        "sender_user_id": row.get("sender_user_id"),
        "sender_email": row.get("sender_email"),
        "to": row.get("to_recipients") or [],
        "cc": row.get("cc_recipients") or [],
        "bcc": row.get("bcc_recipients") or [],
        "subject": row.get("subject") or "",
        "body": row.get("body") or "",
        "status": row.get("status") or "sent",
        "folder": row.get("state_folder") or row.get("folder") or "sent",
        "is_read": row.get("is_read"),
        "is_starred": row.get("is_starred"),
        "ai_flags": row.get("ai_flags") or {},
        "related_project_id": row.get("related_project_id"),
        "related_young_person_id": row.get("related_young_person_id"),
        "external_delivery_status": row.get("external_delivery_status"),
        "external_error": row.get("external_error"),
        "parent_message_id": row.get("parent_message_id"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


@router.get("/diagnostics")
def diagnostics(current_user=Depends(get_current_user)):
    return {
        "ok": True,
        "message": "IndiCare Mail ready",
        "user_id": _user_id(current_user),
        "external_smtp_configured": _smtp_configured(),
    }


@router.get("/messages")
def list_messages(
    folder: str = Query("inbox", pattern="^(inbox|sent|drafts|archive|starred|all)$"),
    q: str | None = Query(None, max_length=200),
    limit: int = Query(50, ge=1, le=100),
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _user_id(current_user)
    _ensure(conn)
    conditions = ["m.deleted_at IS NULL"]
    params: list[Any] = [user_id]

    join = "LEFT JOIN indicare_mail_user_state s ON s.message_id = m.id AND s.user_id = %s"
    if folder == "inbox":
        conditions.append("s.user_id = %s AND s.deleted_at IS NULL AND s.archived_at IS NULL AND COALESCE(s.folder, 'inbox') = 'inbox'")
        params.append(user_id)
    elif folder == "sent":
        conditions.append("m.sender_user_id = %s AND m.folder = 'sent'")
        params.append(user_id)
    elif folder == "drafts":
        conditions.append("m.sender_user_id = %s AND m.status = 'draft'")
        params.append(user_id)
    elif folder == "archive":
        conditions.append("s.user_id = %s AND s.archived_at IS NOT NULL")
        params.append(user_id)
    elif folder == "starred":
        conditions.append("s.user_id = %s AND s.is_starred IS TRUE")
        params.append(user_id)
    else:
        conditions.append("(m.sender_user_id = %s OR s.user_id = %s)")
        params.extend([user_id, user_id])

    if q:
        conditions.append("(m.subject ILIKE %s OR m.body ILIKE %s OR m.sender_email ILIKE %s)")
        params.extend([f"%{q}%", f"%{q}%", f"%{q}%"])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT m.*, s.folder AS state_folder, s.is_read, s.is_starred
            FROM indicare_mail_messages m
            {join}
            WHERE {' AND '.join(conditions)}
            ORDER BY m.created_at DESC
            LIMIT %s
            """,
            (*params, limit),
        )
        rows = cur.fetchall()

    return {"ok": True, "messages": [_message_payload(dict(row)) for row in rows]}


@router.get("/threads/{thread_id}")
def get_thread(
    thread_id: str,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _user_id(current_user)
    _ensure(conn)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT m.*, s.folder AS state_folder, s.is_read, s.is_starred
            FROM indicare_mail_messages m
            LEFT JOIN indicare_mail_user_state s ON s.message_id = m.id AND s.user_id = %s
            WHERE m.thread_id = %s
              AND m.deleted_at IS NULL
              AND (m.sender_user_id = %s OR s.user_id = %s)
            ORDER BY m.created_at ASC
            """,
            (user_id, thread_id, user_id, user_id),
        )
        rows = cur.fetchall()
    return {"ok": True, "messages": [_message_payload(dict(row)) for row in rows]}


@router.post("/messages")
def create_message(
    payload: MailDraft,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _user_id(current_user)
    sender = _current_email(current_user)
    to = _clean_recipients(payload.to)
    cc = _clean_recipients(payload.cc)
    bcc = _clean_recipients(payload.bcc)
    if not to and not cc and not bcc:
        raise HTTPException(status_code=400, detail="At least one recipient is required.")
    if not payload.subject.strip() and not payload.body.strip():
        raise HTTPException(status_code=400, detail="Subject or body is required.")

    _ensure(conn)
    internal_user_ids = _recipient_user_ids(conn, to + cc + bcc)
    external_status = None
    external_error = None
    all_recips = to + cc + bcc
    internal_emails = set()
    if internal_user_ids:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT email FROM users WHERE id = ANY(%s)", (internal_user_ids,))
            internal_emails = {str(row["email"]).lower() for row in cur.fetchall()}
    external_recipients = [email for email in all_recips if email.lower() not in internal_emails]

    if payload.send_external and external_recipients:
        external_status, external_error = _send_external_email(sender, to, cc, bcc, payload.subject, payload.body)
    elif external_recipients:
        external_status = "skipped"
        external_error = "External sending disabled for this message."

    ai_flags = _analyse_mail(payload.subject, payload.body)

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO indicare_mail_messages (
                    thread_id, sender_user_id, sender_email, to_recipients, cc_recipients, bcc_recipients,
                    subject, body, status, folder, ai_flags, related_project_id, related_young_person_id,
                    external_delivery_status, external_error, parent_message_id
                )
                VALUES (COALESCE((SELECT thread_id FROM indicare_mail_messages WHERE id = %s), gen_random_uuid()), %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s, 'sent', 'sent', %s::jsonb, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    payload.parent_message_id,
                    user_id,
                    sender,
                    json.dumps(to),
                    json.dumps(cc),
                    json.dumps(bcc),
                    payload.subject.strip(),
                    payload.body.strip(),
                    json.dumps(ai_flags),
                    payload.related_project_id,
                    payload.related_young_person_id,
                    external_status,
                    external_error,
                    payload.parent_message_id,
                ),
            )
            message = dict(cur.fetchone())
            for recipient_user_id in internal_user_ids:
                cur.execute(
                    """
                    INSERT INTO indicare_mail_user_state (message_id, user_id, folder, is_read)
                    VALUES (%s, %s, 'inbox', FALSE)
                    ON CONFLICT (message_id, user_id) DO NOTHING
                    """,
                    (message["id"], recipient_user_id),
                )
        conn.commit()
        return {"ok": True, "message": _message_payload(message), "internal_recipients": len(internal_user_ids), "external_delivery_status": external_status, "external_error": external_error}
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Could not send message: {exc}") from exc


@router.patch("/messages/{message_id}/state")
def update_state(
    message_id: int,
    payload: MailStateUpdate,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _user_id(current_user)
    _ensure(conn)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO indicare_mail_user_state (message_id, user_id)
            VALUES (%s, %s)
            ON CONFLICT (message_id, user_id) DO NOTHING
            """,
            (message_id, user_id),
        )
        updates: list[str] = ["updated_at = now()"]
        values: list[Any] = []
        if payload.is_read is not None:
            updates.append("is_read = %s")
            values.append(payload.is_read)
        if payload.is_starred is not None:
            updates.append("is_starred = %s")
            values.append(payload.is_starred)
        if payload.archive is not None:
            updates.append("archived_at = CASE WHEN %s THEN now() ELSE NULL END")
            values.append(payload.archive)
        if payload.delete is not None:
            updates.append("deleted_at = CASE WHEN %s THEN now() ELSE NULL END")
            values.append(payload.delete)
        cur.execute(
            f"UPDATE indicare_mail_user_state SET {', '.join(updates)} WHERE message_id = %s AND user_id = %s",
            (*values, message_id, user_id),
        )
    conn.commit()
    return {"ok": True}
