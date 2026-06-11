"""ORB Residential closed-pilot feedback — lightweight storage."""

from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

CREATE_ORB_PILOT_FEEDBACK_SQL = """
CREATE TABLE IF NOT EXISTS orb_pilot_feedback (
    id TEXT PRIMARY KEY,
    pilot_id TEXT NULL,
    user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    role TEXT NULL,
    feature_used TEXT NOT NULL,
    task_type TEXT NULL,
    time_saved_minutes INTEGER NULL,
    record_quality_rating INTEGER NULL,
    child_voice_rating INTEGER NULL,
    therapeutic_language_rating INTEGER NULL,
    staff_confidence_rating INTEGER NULL,
    manager_oversight_rating INTEGER NULL,
    safeguarding_prompt_rating INTEGER NULL,
    would_use_again BOOLEAN NULL,
    what_helped_the_child TEXT NULL,
    what_worked_well TEXT NULL,
    what_felt_unsafe_or_unhelpful TEXT NULL,
    improvement_suggestion TEXT NULL,
    bug_or_friction TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_pilot_feedback_created
    ON orb_pilot_feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orb_pilot_feedback_pilot
    ON orb_pilot_feedback (pilot_id, created_at DESC);
"""

UNSAFE_TEXT_PATTERNS = (
    re.compile(r"\bNHS\s*(?:number|no\.?|#)?\s*:?\s*\d{3}\s?\d{3}\s?\d{4}\b", re.I),
    re.compile(r"\b(court order|police report|social worker report|section 47|section 37)\b", re.I),
    re.compile(r"\b(full chronology|complete care record|full child record)\b", re.I),
    re.compile(
        r"\b(disclosed abuse|sexual abuse|self[- ]?harm|suicide|missing from care)\b", re.I
    ),
    re.compile(
        r"\b(child|young person|yp)\s+(?:called|named)\s+[A-Z][a-z]{1,20}\b", re.I
    ),
    re.compile(r"\b(staff|worker|manager)\s+(?:called|named)\s+[A-Z][a-z]{1,20}\b", re.I),
)

MAX_TEXT_LENGTH = 600

_tables_ready = False


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).isoformat()


def ensure_pilot_feedback_table(conn: Any | None = None) -> None:
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
            cur.execute(CREATE_ORB_PILOT_FEEDBACK_SQL)
        if owned:
            db_conn.commit()
        _tables_ready = True
    except Exception:
        if owned and db_conn is not None:
            try:
                db_conn.rollback()
            except Exception:
                pass
        logger.warning("Could not initialise orb_pilot_feedback table", exc_info=True)
    finally:
        if owned and db_conn is not None:
            from db.connection import release_db_connection

            release_db_connection(db_conn)


def sanitise_pilot_feedback_text(raw: str | None) -> tuple[str | None, str | None]:
    if raw is None:
        return None, None
    cleaned = re.sub(r"<[^>]+>", " ", str(raw))
    cleaned = re.sub(r"[\x00-\x1f\x7f]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return None, None
    if len(cleaned) > MAX_TEXT_LENGTH:
        return cleaned[:MAX_TEXT_LENGTH], f"Text truncated to {MAX_TEXT_LENGTH} characters."
    for pattern in UNSAFE_TEXT_PATTERNS:
        if pattern.search(cleaned):
            return None, (
                "Please do not include child names, staff names, full records or detailed safeguarding narratives."
            )
    return cleaned, None


def _row_to_payload(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "pilotId": row.get("pilot_id"),
        "userId": row.get("user_id"),
        "role": row.get("role"),
        "featureUsed": row["feature_used"],
        "taskType": row.get("task_type"),
        "timeSavedMinutes": row.get("time_saved_minutes"),
        "recordQualityRating": row.get("record_quality_rating"),
        "childVoiceRating": row.get("child_voice_rating"),
        "therapeuticLanguageRating": row.get("therapeutic_language_rating"),
        "staffConfidenceRating": row.get("staff_confidence_rating"),
        "managerOversightRating": row.get("manager_oversight_rating"),
        "safeguardingPromptRating": row.get("safeguarding_prompt_rating"),
        "wouldUseAgain": row.get("would_use_again"),
        "whatHelpedTheChild": row.get("what_helped_the_child"),
        "whatWorkedWell": row.get("what_worked_well"),
        "whatFeltUnsafeOrUnhelpful": row.get("what_felt_unsafe_or_unhelpful"),
        "improvementSuggestion": row.get("improvement_suggestion"),
        "bugOrFriction": row.get("bug_or_friction"),
        "createdAt": _iso(row.get("created_at")),
    }


def create_pilot_feedback(
    conn,
    *,
    user_id: int | None,
    role: str | None,
    payload: dict[str, Any],
) -> dict[str, Any] | None:
    ensure_pilot_feedback_table(conn)
    text_fields = {
        "task_type": payload.get("taskType"),
        "what_helped_the_child": payload.get("whatHelpedTheChild"),
        "what_worked_well": payload.get("whatWorkedWell"),
        "what_felt_unsafe_or_unhelpful": payload.get("whatFeltUnsafeOrUnhelpful"),
        "improvement_suggestion": payload.get("improvementSuggestion"),
        "bug_or_friction": payload.get("bugOrFriction"),
    }
    sanitised_text: dict[str, str | None] = {}
    for key, value in text_fields.items():
        cleaned, error = sanitise_pilot_feedback_text(value)
        if error and value:
            raise ValueError(error)
        sanitised_text[key] = cleaned

    feedback_id = f"opf-{uuid.uuid4().hex}"
    now = _utc_now()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO orb_pilot_feedback (
                    id, pilot_id, user_id, role, feature_used, task_type,
                    time_saved_minutes, record_quality_rating, child_voice_rating,
                    therapeutic_language_rating, staff_confidence_rating,
                    manager_oversight_rating, safeguarding_prompt_rating,
                    would_use_again, what_helped_the_child, what_worked_well,
                    what_felt_unsafe_or_unhelpful, improvement_suggestion,
                    bug_or_friction, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING *
                """,
                (
                    feedback_id,
                    payload.get("pilotId"),
                    user_id,
                    role,
                    payload["featureUsed"],
                    sanitised_text["task_type"],
                    payload.get("timeSavedMinutes"),
                    payload.get("recordQualityRating"),
                    payload.get("childVoiceRating"),
                    payload.get("therapeuticLanguageRating"),
                    payload.get("staffConfidenceRating"),
                    payload.get("managerOversightRating"),
                    payload.get("safeguardingPromptRating"),
                    payload.get("wouldUseAgain"),
                    sanitised_text["what_helped_the_child"],
                    sanitised_text["what_worked_well"],
                    sanitised_text["what_felt_unsafe_or_unhelpful"],
                    sanitised_text["improvement_suggestion"],
                    sanitised_text["bug_or_friction"],
                    now,
                ),
            )
            row = dict(cur.fetchone() or {})
        conn.commit()
        return _row_to_payload(row)
    except ValueError:
        raise
    except Exception as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        if "orb_pilot_feedback" in str(exc).lower() or "does not exist" in str(exc).lower():
            logger.debug("orb_pilot_feedback unavailable", exc_info=True)
            return None
        logger.exception("create_pilot_feedback failed user_id=%s", user_id)
        raise


def list_pilot_feedback_admin(conn, *, limit: int = 200) -> list[dict[str, Any]]:
    ensure_pilot_feedback_table(conn)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM orb_pilot_feedback
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = []
            for row in cur.fetchall():
                payload = _row_to_payload(dict(row))
                for field in (
                    "whatHelpedTheChild",
                    "whatWorkedWell",
                    "whatFeltUnsafeOrUnhelpful",
                    "improvementSuggestion",
                    "bugOrFriction",
                    "taskType",
                ):
                    if payload.get(field):
                        cleaned, _ = sanitise_pilot_feedback_text(payload[field])
                        payload[field] = cleaned or "[redacted — unsafe narrative removed]"
                rows.append(payload)
            return rows
    except Exception as exc:
        if "orb_pilot_feedback" in str(exc).lower() or "does not exist" in str(exc).lower():
            return []
        logger.exception("list_pilot_feedback_admin failed")
        return []
