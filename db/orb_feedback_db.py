from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import psycopg2
from psycopg2.extras import Json, RealDictCursor

logger = logging.getLogger(__name__)


def _row(row) -> dict[str, Any] | None:
    return dict(row) if row else None


def _has_feedback_table_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return (
        isinstance(exc, (psycopg2.errors.UndefinedTable, psycopg2.errors.UndefinedColumn))
        or "orb_feedback" in text
        or "does not exist" in text
    )


def _safe_rollback(conn) -> None:
    try:
        conn.rollback()
    except Exception:
        logger.debug("Could not rollback ORB feedback transaction", exc_info=True)


def insert_orb_feedback(conn, *, payload: dict[str, Any]) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO orb_feedback (
                user_id, message_id, conversation_id, rating, reason, comment,
                answer_snapshot, question_snapshot, mode, profile_role, prompt_tier,
                detected_family, secondary_families, source_anchors, action_id,
                document_lens, metadata
            )
            VALUES (
                %(user_id)s, %(message_id)s, %(conversation_id)s, %(rating)s, %(reason)s,
                %(comment)s, %(answer_snapshot)s, %(question_snapshot)s, %(mode)s,
                %(profile_role)s, %(prompt_tier)s, %(detected_family)s,
                %(secondary_families)s, %(source_anchors)s, %(action_id)s,
                %(document_lens)s, %(metadata)s
            )
            RETURNING id, user_id, message_id, conversation_id, rating, reason, comment,
                      answer_snapshot, question_snapshot, mode, profile_role, prompt_tier,
                      detected_family, secondary_families, source_anchors, action_id,
                      document_lens, metadata, created_at
            """,
            {
                "user_id": payload.get("user_id"),
                "message_id": payload["message_id"],
                "conversation_id": payload.get("conversation_id"),
                "rating": payload["rating"],
                "reason": payload.get("reason"),
                "comment": payload.get("comment"),
                "answer_snapshot": payload.get("answer_snapshot"),
                "question_snapshot": payload.get("question_snapshot"),
                "mode": payload.get("mode"),
                "profile_role": payload.get("profile_role"),
                "prompt_tier": payload.get("prompt_tier"),
                "detected_family": payload.get("detected_family"),
                "secondary_families": Json(payload.get("secondary_families") or []),
                "source_anchors": Json(payload.get("source_anchors") or []),
                "action_id": payload.get("action_id"),
                "document_lens": payload.get("document_lens"),
                "metadata": Json(payload.get("metadata") or {}),
            },
        )
        row = dict(cur.fetchone())
        if row.get("created_at"):
            row["created_at"] = row["created_at"].isoformat()
        return row


def list_orb_feedback(
    conn,
    *,
    days: int | None = None,
    rating: str | None = None,
    limit: int = 5000,
) -> list[dict[str, Any]]:
    clauses = ["1=1"]
    params: list[Any] = []
    if days is not None:
        since = datetime.now(timezone.utc) - timedelta(days=max(1, int(days)))
        clauses.append("created_at >= %s")
        params.append(since)
    if rating:
        clauses.append("rating = %s")
        params.append(rating)
    params.append(max(1, min(int(limit or 5000), 10000)))
    where = " AND ".join(clauses)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT id, user_id, message_id, conversation_id, rating, reason, comment,
                   answer_snapshot, question_snapshot, mode, profile_role, prompt_tier,
                   detected_family, secondary_families, source_anchors, action_id,
                   document_lens, metadata, created_at
            FROM orb_feedback
            WHERE {where}
            ORDER BY created_at DESC
            LIMIT %s
            """,
            params,
        )
        rows = []
        for row in cur.fetchall():
            item = dict(row)
            if item.get("created_at"):
                item["created_at"] = item["created_at"].isoformat()
            rows.append(item)
        return rows


def count_orb_feedback_summary(conn, *, days: int = 30) -> dict[str, Any]:
    since = datetime.now(timezone.utc) - timedelta(days=max(1, int(days)))
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE rating = 'up') AS thumbs_up,
                COUNT(*) FILTER (WHERE rating = 'down') AS thumbs_down
            FROM orb_feedback
            WHERE created_at >= %s
            """,
            (since,),
        )
        totals = dict(cur.fetchone() or {})
        cur.execute(
            """
            SELECT reason, COUNT(*) AS count
            FROM orb_feedback
            WHERE created_at >= %s AND rating = 'down' AND reason IS NOT NULL
            GROUP BY reason
            ORDER BY count DESC
            LIMIT 15
            """,
            (since,),
        )
        top_reasons = [dict(r) for r in cur.fetchall()]
        cur.execute(
            """
            SELECT detected_family AS family, COUNT(*) AS count
            FROM orb_feedback
            WHERE created_at >= %s AND rating = 'down' AND detected_family IS NOT NULL
            GROUP BY detected_family
            ORDER BY count DESC
            LIMIT 15
            """,
            (since,),
        )
        top_families = [dict(r) for r in cur.fetchall()]
        cur.execute(
            """
            SELECT action_id, COUNT(*) AS count
            FROM orb_feedback
            WHERE created_at >= %s AND rating = 'down' AND action_id IS NOT NULL
            GROUP BY action_id
            ORDER BY count DESC
            LIMIT 15
            """,
            (since,),
        )
        top_actions = [dict(r) for r in cur.fetchall()]
    return {
        "total": int(totals.get("total") or 0),
        "thumbs_up": int(totals.get("thumbs_up") or 0),
        "thumbs_down": int(totals.get("thumbs_down") or 0),
        "top_reasons": top_reasons,
        "top_families": top_families,
        "top_actions": top_actions,
    }


def safe_insert_orb_feedback(conn, *, payload: dict[str, Any]) -> dict[str, Any] | None:
    try:
        return insert_orb_feedback(conn, payload=payload)
    except Exception as exc:
        if _has_feedback_table_error(exc):
            _safe_rollback(conn)
            return None
        raise


def safe_list_orb_feedback(conn, **kwargs: Any) -> list[dict[str, Any]] | None:
    try:
        return list_orb_feedback(conn, **kwargs)
    except Exception as exc:
        if _has_feedback_table_error(exc):
            _safe_rollback(conn)
            return None
        raise
