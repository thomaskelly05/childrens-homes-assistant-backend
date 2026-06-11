"""ORB Residential privacy requests — lightweight support queue storage."""

from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

CREATE_ORB_PRIVACY_REQUESTS_SQL = """
CREATE TABLE IF NOT EXISTS orb_privacy_requests (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL,
    summary TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted',
    reviewed_by TEXT NULL,
    review_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_privacy_requests_user
    ON orb_privacy_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orb_privacy_requests_status
    ON orb_privacy_requests (status, created_at DESC);
"""

UNSAFE_SUMMARY_PATTERNS = (
    re.compile(r"\bNHS\s*(?:number|no\.?|#)?\s*:?\s*\d{3}\s?\d{3}\s?\d{4}\b", re.I),
    re.compile(r"\b(court order|police report|social worker report|section 47)\b", re.I),
    re.compile(r"\b(disclosed abuse|sexual abuse|self[- ]?harm|suicide|missing from care)\b", re.I),
    re.compile(r"\b(full chronology|complete care record|full child record)\b", re.I),
)

_tables_ready = False


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).isoformat()


def ensure_privacy_requests_table(conn: Any | None = None) -> None:
    global _tables_ready
    if _tables_ready:
        return
    owned = False
    db_conn = conn
    if db_conn is None:
        from db.connection import get_db_connection

        db_conn = get_db_connection()
        owned = True
    try:
        with db_conn.cursor() as cur:
            cur.execute(CREATE_ORB_PRIVACY_REQUESTS_SQL)
        if owned:
            db_conn.commit()
        _tables_ready = True
    except Exception:
        if owned and db_conn is not None:
            try:
                db_conn.rollback()
            except Exception:
                pass
        logger.warning("Could not initialise orb_privacy_requests table", exc_info=True)
    finally:
        if owned and db_conn is not None:
            from db.connection import release_db_connection

            release_db_connection(db_conn)


def sanitise_privacy_request_summary(raw: str) -> tuple[str, str | None]:
    cleaned = re.sub(r"<[^>]+>", " ", str(raw or ""))
    cleaned = re.sub(r"[\x00-\x1f\x7f]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if len(cleaned) < 8:
        return "", "Please describe your request briefly."
    if len(cleaned) > 800:
        return cleaned[:800], "Summary truncated to 800 characters."
    for pattern in UNSAFE_SUMMARY_PATTERNS:
        if pattern.search(cleaned):
            return "", (
                "Please do not include child-identifying details, safeguarding narratives or formal record content."
            )
    return cleaned, None


def _row_to_payload(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "requestType": row["request_type"],
        "summary": row["summary"],
        "status": row["status"],
        "createdAt": _iso(row.get("created_at")),
        "updatedAt": _iso(row.get("updated_at")),
        "reviewedBy": row.get("reviewed_by"),
        "reviewNotes": row.get("review_notes"),
    }


def create_privacy_request(
    conn,
    *,
    user_id: int,
    request_type: str,
    summary: str,
) -> dict[str, Any] | None:
    ensure_privacy_requests_table(conn)
    sanitised, error = sanitise_privacy_request_summary(summary)
    if error and not sanitised:
        raise ValueError(error)
    request_id = f"opr-{uuid.uuid4().hex}"
    now = _utc_now()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO orb_privacy_requests (
                    id, user_id, request_type, summary, status, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, 'submitted', %s, %s)
                RETURNING id, user_id, request_type, summary, status, reviewed_by, review_notes, created_at, updated_at
                """,
                (request_id, user_id, request_type, sanitised, now, now),
            )
            row = dict(cur.fetchone() or {})
        conn.commit()
        return _row_to_payload(row)
    except Exception as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        if "orb_privacy_requests" in str(exc).lower() or "does not exist" in str(exc).lower():
            logger.debug("orb_privacy_requests unavailable", exc_info=True)
            return None
        logger.exception("create_privacy_request failed user_id=%s", user_id)
        raise


def list_privacy_requests_for_user(conn, *, user_id: int) -> list[dict[str, Any]]:
    ensure_privacy_requests_table(conn)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, request_type, summary, status, reviewed_by, review_notes, created_at, updated_at
                FROM orb_privacy_requests
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 50
                """,
                (user_id,),
            )
            return [_row_to_payload(dict(row)) for row in cur.fetchall()]
    except Exception as exc:
        if "orb_privacy_requests" in str(exc).lower() or "does not exist" in str(exc).lower():
            return []
        logger.exception("list_privacy_requests_for_user failed user_id=%s", user_id)
        return []


def list_privacy_requests_admin(conn, *, limit: int = 100) -> list[dict[str, Any]]:
    ensure_privacy_requests_table(conn)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, request_type, summary, status, reviewed_by, review_notes, created_at, updated_at
                FROM orb_privacy_requests
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = []
            for row in cur.fetchall():
                payload = _row_to_payload(dict(row))
                payload["summary"] = _redact_admin_summary(payload.get("summary") or "")
                rows.append(payload)
            return rows
    except Exception as exc:
        if "orb_privacy_requests" in str(exc).lower() or "does not exist" in str(exc).lower():
            return []
        logger.exception("list_privacy_requests_admin failed")
        return []


def _redact_admin_summary(summary: str) -> str:
    sanitised, error = sanitise_privacy_request_summary(summary)
    if error and not sanitised:
        return "[redacted — unsafe narrative removed]"
    return sanitised
