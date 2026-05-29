from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import psycopg2
from psycopg2.extras import Json, RealDictCursor

logger = logging.getLogger(__name__)

_memory_candidates: list[dict[str, Any]] = []


def _row(row) -> dict[str, Any] | None:
    return dict(row) if row else None


def _has_table_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return (
        isinstance(exc, (psycopg2.errors.UndefinedTable, psycopg2.errors.UndefinedColumn))
        or "orb_improvement_candidates" in text
        or "does not exist" in text
    )


def _safe_rollback(conn) -> None:
    try:
        conn.rollback()
    except Exception:
        logger.debug("Could not rollback improvement candidate transaction", exc_info=True)


def _serialise_row(row: dict[str, Any]) -> dict[str, Any]:
    item = dict(row)
    if item.get("created_at"):
        item["created_at"] = item["created_at"].isoformat()
    if item.get("updated_at"):
        item["updated_at"] = item["updated_at"].isoformat()
    if item.get("reviewed_at"):
        item["reviewed_at"] = item["reviewed_at"].isoformat()
    if item.get("confidence") is not None:
        item["confidence"] = float(item["confidence"])
    return item


def upsert_improvement_candidate(conn, *, payload: dict[str, Any]) -> dict[str, Any] | None:
    candidate_id = str(payload.get("candidate_id") or uuid4())
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO orb_improvement_candidates (
                candidate_id, candidate_type, status, source_feedback_ids, proposed_change,
                affected_family, affected_action, affected_source, affected_role,
                reason_count, confidence, metadata
            )
            VALUES (
                %(candidate_id)s, %(candidate_type)s, %(status)s, %(source_feedback_ids)s,
                %(proposed_change)s, %(affected_family)s, %(affected_action)s, %(affected_source)s,
                %(affected_role)s, %(reason_count)s, %(confidence)s, %(metadata)s
            )
            ON CONFLICT (candidate_id) DO UPDATE SET
                source_feedback_ids = orb_improvement_candidates.source_feedback_ids || EXCLUDED.source_feedback_ids,
                reason_count = orb_improvement_candidates.reason_count + EXCLUDED.reason_count,
                proposed_change = EXCLUDED.proposed_change,
                updated_at = NOW()
            RETURNING id, candidate_id, candidate_type, status, source_feedback_ids, proposed_change,
                      affected_family, affected_action, affected_source, affected_role,
                      reason_count, confidence, metadata, created_at, updated_at,
                      reviewed_by, reviewed_at, reviewer_note
            """,
            {
                "candidate_id": candidate_id,
                "candidate_type": payload["candidate_type"],
                "status": payload.get("status") or "pending",
                "source_feedback_ids": Json(payload.get("source_feedback_ids") or []),
                "proposed_change": Json(payload.get("proposed_change") or {}),
                "affected_family": payload.get("affected_family"),
                "affected_action": payload.get("affected_action"),
                "affected_source": payload.get("affected_source"),
                "affected_role": payload.get("affected_role"),
                "reason_count": max(1, int(payload.get("reason_count") or 1)),
                "confidence": float(payload.get("confidence") or 0.5),
                "metadata": Json(payload.get("metadata") or {}),
            },
        )
        return _serialise_row(dict(cur.fetchone()))


def find_pending_candidate(
    conn,
    *,
    candidate_type: str,
    affected_family: str | None,
    reason: str | None = None,
) -> dict[str, Any] | None:
    clauses = ["status = 'pending'", "candidate_type = %s"]
    params: list[Any] = [candidate_type]
    if affected_family:
        clauses.append("affected_family = %s")
        params.append(affected_family)
    else:
        clauses.append("affected_family IS NULL")
    if reason:
        clauses.append("metadata->>'reason' = %s")
        params.append(reason)
    where = " AND ".join(clauses)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT id, candidate_id, candidate_type, status, source_feedback_ids, proposed_change,
                   affected_family, affected_action, affected_source, affected_role,
                   reason_count, confidence, metadata, created_at, updated_at,
                   reviewed_by, reviewed_at, reviewer_note
            FROM orb_improvement_candidates
            WHERE {where}
            ORDER BY updated_at DESC
            LIMIT 1
            """,
            params,
        )
        row = cur.fetchone()
        return _serialise_row(dict(row)) if row else None


def list_improvement_candidates(
    conn,
    *,
    status: str | None = None,
    candidate_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    clauses = ["1=1"]
    params: list[Any] = []
    if status:
        clauses.append("status = %s")
        params.append(status)
    if candidate_type:
        clauses.append("candidate_type = %s")
        params.append(candidate_type)
    params.extend([max(1, min(limit, 500)), max(0, offset)])
    where = " AND ".join(clauses)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT id, candidate_id, candidate_type, status, source_feedback_ids, proposed_change,
                   affected_family, affected_action, affected_source, affected_role,
                   reason_count, confidence, metadata, created_at, updated_at,
                   reviewed_by, reviewed_at, reviewer_note
            FROM orb_improvement_candidates
            WHERE {where}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            """,
            params,
        )
        return [_serialise_row(dict(row)) for row in cur.fetchall()]


def get_improvement_candidate_by_id(conn, *, candidate_id: str) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, candidate_id, candidate_type, status, source_feedback_ids, proposed_change,
                   affected_family, affected_action, affected_source, affected_role,
                   reason_count, confidence, metadata, created_at, updated_at,
                   reviewed_by, reviewed_at, reviewer_note
            FROM orb_improvement_candidates
            WHERE candidate_id = %s
            """,
            (candidate_id,),
        )
        row = cur.fetchone()
        return _serialise_row(dict(row)) if row else None


def update_candidate_status(
    conn,
    *,
    candidate_id: str,
    status: str,
    reviewed_by: int | None,
    reviewer_note: str | None = None,
) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE orb_improvement_candidates
            SET status = %s,
                reviewed_by = %s,
                reviewed_at = NOW(),
                reviewer_note = %s,
                updated_at = NOW()
            WHERE candidate_id = %s AND status = 'pending'
            RETURNING id, candidate_id, candidate_type, status, source_feedback_ids, proposed_change,
                      affected_family, affected_action, affected_source, affected_role,
                      reason_count, confidence, metadata, created_at, updated_at,
                      reviewed_by, reviewed_at, reviewer_note
            """,
            (status, reviewed_by, reviewer_note, candidate_id),
        )
        row = cur.fetchone()
        return _serialise_row(dict(row)) if row else None


def safe_upsert_improvement_candidate(conn, *, payload: dict[str, Any]) -> dict[str, Any] | None:
    try:
        return upsert_improvement_candidate(conn, payload=payload)
    except Exception as exc:
        if _has_table_error(exc):
            _safe_rollback(conn)
            return _memory_upsert(payload)
        raise


def safe_list_improvement_candidates(conn, **kwargs: Any) -> list[dict[str, Any]] | None:
    try:
        return list_improvement_candidates(conn, **kwargs)
    except Exception as exc:
        if _has_table_error(exc):
            _safe_rollback(conn)
            return _memory_list(**kwargs)
        raise


def safe_get_improvement_candidate(conn, *, candidate_id: str) -> dict[str, Any] | None:
    try:
        return get_improvement_candidate_by_id(conn, candidate_id=candidate_id)
    except Exception as exc:
        if _has_table_error(exc):
            _safe_rollback(conn)
            return next((c for c in _memory_candidates if c.get("candidate_id") == candidate_id), None)
        raise


def safe_update_candidate_status(conn, **kwargs: Any) -> dict[str, Any] | None:
    try:
        return update_candidate_status(conn, **kwargs)
    except Exception as exc:
        if _has_table_error(exc):
            _safe_rollback(conn)
            return _memory_update_status(**kwargs)
        raise


def safe_find_pending_candidate(conn, **kwargs: Any) -> dict[str, Any] | None:
    try:
        return find_pending_candidate(conn, **kwargs)
    except Exception as exc:
        if _has_table_error(exc):
            _safe_rollback(conn)
            return None
        raise


def _memory_upsert(payload: dict[str, Any]) -> dict[str, Any]:
    candidate_id = str(payload.get("candidate_id") or uuid4())
    now = datetime.now(timezone.utc).isoformat()
    for item in _memory_candidates:
        if item.get("candidate_id") == candidate_id:
            ids = list(item.get("source_feedback_ids") or [])
            ids.extend(payload.get("source_feedback_ids") or [])
            item["source_feedback_ids"] = ids
            item["reason_count"] = int(item.get("reason_count") or 0) + int(payload.get("reason_count") or 1)
            item["updated_at"] = now
            return dict(item)
    row = {
        "id": len(_memory_candidates) + 1,
        "candidate_id": candidate_id,
        "candidate_type": payload["candidate_type"],
        "status": payload.get("status") or "pending",
        "source_feedback_ids": list(payload.get("source_feedback_ids") or []),
        "proposed_change": payload.get("proposed_change") or {},
        "affected_family": payload.get("affected_family"),
        "affected_action": payload.get("affected_action"),
        "affected_source": payload.get("affected_source"),
        "affected_role": payload.get("affected_role"),
        "reason_count": max(1, int(payload.get("reason_count") or 1)),
        "confidence": float(payload.get("confidence") or 0.5),
        "metadata": payload.get("metadata") or {},
        "created_at": now,
        "updated_at": now,
        "reviewed_by": None,
        "reviewed_at": None,
        "reviewer_note": None,
    }
    _memory_candidates.append(row)
    return dict(row)


def _memory_list(*, status: str | None = None, candidate_type: str | None = None, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
    rows = list(_memory_candidates)
    if status:
        rows = [r for r in rows if r.get("status") == status]
    if candidate_type:
        rows = [r for r in rows if r.get("candidate_type") == candidate_type]
    return rows[offset : offset + limit]


def _memory_update_status(
    *,
    candidate_id: str,
    status: str,
    reviewed_by: int | None,
    reviewer_note: str | None = None,
) -> dict[str, Any] | None:
    now = datetime.now(timezone.utc).isoformat()
    for item in _memory_candidates:
        if item.get("candidate_id") == candidate_id and item.get("status") == "pending":
            item["status"] = status
            item["reviewed_by"] = reviewed_by
            item["reviewed_at"] = now
            item["reviewer_note"] = reviewer_note
            item["updated_at"] = now
            return dict(item)
    return None


def reset_memory_candidates() -> None:
    _memory_candidates.clear()
