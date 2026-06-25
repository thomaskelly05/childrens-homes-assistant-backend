"""Founder OS persistence — PostgreSQL storage for founder command centre records."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger(__name__)

CREATE_FOUNDER_PERSISTENCE_SQL = """
CREATE TABLE IF NOT EXISTS founder_os_records (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT,
    created_by TEXT NOT NULL DEFAULT 'founder',
    source TEXT NOT NULL DEFAULT 'founder-ui',
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_os_records_entity_type
    ON founder_os_records (entity_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_os_records_status
    ON founder_os_records (entity_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_os_records_user
    ON founder_os_records (user_id, entity_type, created_at DESC);

CREATE TABLE IF NOT EXISTS founder_os_audit_log (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    actor TEXT NOT NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    status TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    linked_entity_id TEXT,
    linked_entity_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_os_audit_log_created
    ON founder_os_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_os_audit_log_entity
    ON founder_os_audit_log (entity_type, created_at DESC);
"""

NO_DELETE_ENTITY_TYPES = frozenset({
    "approval",
    "quality_run",
    "quality_result",
    "quality_proposal",
    "expert_review",
    "safety_review",
    "founder_memory",
    "audit_log",
    "lab_review_event",
    "lab_suggestion",
    "lab_evaluation_run",
    "lab_build_brief",
    "lab_founder_action",
    "lab_audit_event",
})

BOOTSTRAP_ENTITY_TYPES = (
    "action",
    "approval",
    "content",
    "build_brief",
    "quality_run",
    "quality_proposal",
    "expert_review",
    "founder_memory",
    "evidence_pack",
    "relationship",
    "operating_loop_run",
)

IDENTIFIABLE_FIELD_KEYS = frozenset({
    "child_name",
    "childName",
    "staff_name",
    "staffName",
    "provider_name",
    "providerName",
    "young_person_name",
    "youngPersonName",
    "first_name",
    "last_name",
    "display_name",
})

_tables_ready = False


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).isoformat()


def _row_to_record(row: Any) -> dict[str, Any]:
    payload = row["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)
    base = dict(payload) if isinstance(payload, dict) else {}
    base.setdefault("id", row["id"])
    base.setdefault("createdAt", _iso(row["created_at"]))
    base.setdefault("updatedAt", _iso(row["updated_at"]))
    base.setdefault("createdBy", row["created_by"])
    base.setdefault("source", row["source"])
    if row["status"] is not None:
        base.setdefault("status", row["status"])
    return base


def _audit_row(row: Any) -> dict[str, Any]:
    metadata = row["metadata"]
    if isinstance(metadata, str):
        metadata = json.loads(metadata)
    return {
        "id": row["id"],
        "createdAt": _iso(row["created_at"]),
        "actor": row["actor"],
        "eventType": row["event_type"],
        "entityType": row["entity_type"],
        "entityId": row["entity_id"],
        "summary": row["summary"],
        "status": row["status"],
        "metadata": metadata if isinstance(metadata, dict) else {},
        "linkedEntityId": row["linked_entity_id"],
        "linkedEntityType": row["linked_entity_type"],
    }


def sanitise_payload(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: sanitise_payload(inner)
            for key, inner in value.items()
            if key not in IDENTIFIABLE_FIELD_KEYS
        }
    if isinstance(value, list):
        return [sanitise_payload(item) for item in value]
    return value


def ensure_founder_persistence_tables(*, conn: Any | None = None) -> None:
    global _tables_ready
    if _tables_ready and conn is None:
        return

    owned = conn is None
    if owned:
        conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(CREATE_FOUNDER_PERSISTENCE_SQL)
        if owned:
            conn.commit()
            _tables_ready = True
    finally:
        if owned:
            release_db_connection(conn)


def create_record(
    *,
    user_id: int,
    entity_type: str,
    record: dict[str, Any],
    actor: str,
    source: str = "founder-ui",
) -> dict[str, Any]:
    ensure_founder_persistence_tables()
    record_id = str(record.get("id") or f"founder-{entity_type}-{uuid.uuid4().hex[:12]}")
    now = _utc_now()
    safe_payload = sanitise_payload(record)
    safe_payload["id"] = record_id
    safe_payload["createdAt"] = safe_payload.get("createdAt") or _iso(now)
    safe_payload["updatedAt"] = safe_payload.get("updatedAt") or _iso(now)
    safe_payload["createdBy"] = safe_payload.get("createdBy") or actor
    safe_payload["source"] = safe_payload.get("source") or source
    status = safe_payload.get("status")

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO founder_os_records (
                    id, entity_type, user_id, status, created_by, source, payload, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)
                """,
                (
                    record_id,
                    entity_type,
                    user_id,
                    status,
                    safe_payload["createdBy"],
                    safe_payload["source"],
                    json.dumps(safe_payload),
                    now,
                    now,
                ),
            )
        conn.commit()
    finally:
        release_db_connection(conn)
    return safe_payload


def list_records(
    *,
    user_id: int,
    entity_type: str,
    status: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[dict[str, Any]]:
    ensure_founder_persistence_tables()
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if status:
                cur.execute(
                    """
                    SELECT id, entity_type, user_id, status, created_by, source, payload, created_at, updated_at
                    FROM founder_os_records
                    WHERE user_id = %s AND entity_type = %s AND status = %s
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    (user_id, entity_type, status, limit, offset),
                )
            else:
                cur.execute(
                    """
                    SELECT id, entity_type, user_id, status, created_by, source, payload, created_at, updated_at
                    FROM founder_os_records
                    WHERE user_id = %s AND entity_type = %s
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    (user_id, entity_type, limit, offset),
                )
            rows = cur.fetchall()
        return [_row_to_record(row) for row in rows]
    finally:
        release_db_connection(conn)


def list_bootstrap_persistence(
    *,
    user_id: int,
    entity_types: tuple[str, ...] = BOOTSTRAP_ENTITY_TYPES,
    limit_per_type: int = 200,
    conn: Any | None = None,
) -> dict[str, list[dict[str, Any]]]:
    """Load all founder persistence entity lists using a single DB connection."""
    ensure_founder_persistence_tables(conn=conn)
    grouped: dict[str, list[dict[str, Any]]] = {entity_type: [] for entity_type in entity_types}
    owned = conn is None
    if owned:
        conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            for entity_type in entity_types:
                cur.execute(
                    """
                    SELECT id, entity_type, user_id, status, created_by, source, payload, created_at, updated_at
                    FROM founder_os_records
                    WHERE user_id = %s AND entity_type = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (user_id, entity_type, limit_per_type),
                )
                grouped[entity_type] = [_row_to_record(row) for row in cur.fetchall()]
        return grouped
    finally:
        if owned:
            release_db_connection(conn)


def get_record(*, user_id: int, entity_type: str, record_id: str) -> dict[str, Any] | None:
    ensure_founder_persistence_tables()
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, entity_type, user_id, status, created_by, source, payload, created_at, updated_at
                FROM founder_os_records
                WHERE user_id = %s AND entity_type = %s AND id = %s
                """,
                (user_id, entity_type, record_id),
            )
            row = cur.fetchone()
        return _row_to_record(row) if row else None
    finally:
        release_db_connection(conn)


def update_record(
    *,
    user_id: int,
    entity_type: str,
    record_id: str,
    patch: dict[str, Any],
    actor: str,
) -> dict[str, Any] | None:
    existing = get_record(user_id=user_id, entity_type=entity_type, record_id=record_id)
    if not existing:
        return None

    now = _utc_now()
    merged = {**existing, **sanitise_payload(patch)}
    merged["id"] = record_id
    merged["updatedAt"] = _iso(now)
    merged["createdBy"] = existing.get("createdBy") or actor
    status = merged.get("status")

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE founder_os_records
                SET status = %s,
                    payload = %s::jsonb,
                    updated_at = %s
                WHERE user_id = %s AND entity_type = %s AND id = %s
                RETURNING id, entity_type, user_id, status, created_by, source, payload, created_at, updated_at
                """,
                (status, json.dumps(merged), now, user_id, entity_type, record_id),
            )
            row = cur.fetchone()
        conn.commit()
        return _row_to_record(row) if row else None
    finally:
        release_db_connection(conn)


def delete_record(*, user_id: int, entity_type: str, record_id: str) -> bool:
    if entity_type in NO_DELETE_ENTITY_TYPES:
        return False
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM founder_os_records
                WHERE user_id = %s AND entity_type = %s AND id = %s
                """,
                (user_id, entity_type, record_id),
            )
            deleted = cur.rowcount == 1
        conn.commit()
        return deleted
    finally:
        release_db_connection(conn)


def append_audit_log(
    *,
    user_id: int,
    actor: str,
    event_type: str,
    entity_type: str,
    entity_id: str,
    summary: str,
    status: str | None = None,
    metadata: dict[str, Any] | None = None,
    linked_entity_id: str | None = None,
    linked_entity_type: str | None = None,
) -> dict[str, Any] | None:
    """Append audit log entry. Returns None when audit logging fails (must not block callers)."""
    ensure_founder_persistence_tables()
    audit_id = f"audit-{uuid.uuid4().hex[:16]}"
    now = _utc_now()
    safe_metadata = sanitise_payload(metadata or {})

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO founder_os_audit_log (
                    id, user_id, actor, event_type, entity_type, entity_id,
                    summary, status, metadata, linked_entity_id, linked_entity_type, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s)
                RETURNING *
                """,
                (
                    audit_id,
                    user_id,
                    actor,
                    event_type,
                    entity_type,
                    entity_id,
                    summary,
                    status,
                    json.dumps(safe_metadata),
                    linked_entity_id,
                    linked_entity_type,
                    now,
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return _audit_row(row) if row else None
    except Exception as exc:
        logger.warning("founder_audit_log_failed: %s", exc)
        try:
            conn.rollback()
        except Exception:
            pass
        return None
    finally:
        release_db_connection(conn)


def list_audit_log(
    *,
    user_id: int,
    entity_type: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[dict[str, Any]]:
    ensure_founder_persistence_tables()
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if entity_type:
                cur.execute(
                    """
                    SELECT *
                    FROM founder_os_audit_log
                    WHERE user_id = %s AND entity_type = %s
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    (user_id, entity_type, limit, offset),
                )
            else:
                cur.execute(
                    """
                    SELECT *
                    FROM founder_os_audit_log
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    (user_id, limit, offset),
                )
            rows = cur.fetchall()
        return [_audit_row(row) for row in rows]
    finally:
        release_db_connection(conn)
