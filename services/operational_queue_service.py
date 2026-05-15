from __future__ import annotations

import hashlib
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from psycopg2.extras import Json


def _now_dt() -> datetime:
    return datetime.now(timezone.utc)


def _now() -> str:
    return _now_dt().isoformat()


@dataclass(frozen=True)
class OperationalQueueItem:
    queue_id: str
    operation_type: str
    payload: dict[str, Any]
    idempotency_key: str
    scope: str
    status: str = "queued"
    attempts: int = 0
    max_attempts: int = 5
    created_at: str = field(default_factory=_now)
    next_attempt_at: str = field(default_factory=_now)
    last_error: str | None = None


class OperationalQueueService:
    """Idempotent retry planning for saves, uploads, exports and writebacks."""

    retryable_statuses = {408, 409, 425, 429, 500, 502, 503, 504}

    def __init__(self) -> None:
        self._memory: dict[str, OperationalQueueItem] = {}

    def idempotency_key(self, *, operation_type: str, scope: str, client_token: str | None = None) -> str:
        raw = f"{operation_type}:{scope}:{client_token or _now()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def queue_item(
        self,
        *,
        operation_type: str,
        payload: dict[str, Any],
        scope: str,
        client_token: str | None = None,
        conn: Any | None = None,
    ) -> OperationalQueueItem:
        key = self.idempotency_key(operation_type=operation_type, scope=scope, client_token=client_token)
        item = OperationalQueueItem(
            queue_id=hashlib.sha1(key.encode("utf-8")).hexdigest(),
            operation_type=operation_type,
            payload=payload,
            idempotency_key=key,
            scope=scope,
        )
        self._memory.setdefault(item.queue_id, item)
        if conn is not None:
            self.persist(conn, item)
        return item

    def persist(self, conn: Any, item: OperationalQueueItem) -> OperationalQueueItem:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO operational_queue_items (
                    queue_id, operation_type, scope, payload, idempotency_key,
                    status, attempts, max_attempts, next_attempt_at, last_error
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (idempotency_key) DO UPDATE SET
                    payload = EXCLUDED.payload,
                    updated_at = NOW()
                RETURNING queue_id, operation_type, scope, payload, idempotency_key,
                          status, attempts, max_attempts, created_at, next_attempt_at, last_error
                """,
                (
                    item.queue_id,
                    item.operation_type,
                    item.scope,
                    Json(item.payload),
                    item.idempotency_key,
                    item.status,
                    item.attempts,
                    item.max_attempts,
                    item.next_attempt_at,
                    item.last_error,
                ),
            )
            row = cur.fetchone()
        if row:
            persisted = self.from_row(row)
            self._memory[persisted.queue_id] = persisted
            return persisted
        return item

    def from_row(self, row: Any) -> OperationalQueueItem:
        data = dict(row)
        return OperationalQueueItem(
            queue_id=str(data["queue_id"]),
            operation_type=str(data["operation_type"]),
            payload=dict(data.get("payload") or {}),
            idempotency_key=str(data["idempotency_key"]),
            scope=str(data.get("scope") or ""),
            status=str(data.get("status") or "queued"),
            attempts=int(data.get("attempts") or 0),
            max_attempts=int(data.get("max_attempts") or 5),
            created_at=str(data.get("created_at") or _now()),
            next_attempt_at=str(data.get("next_attempt_at") or _now()),
            last_error=data.get("last_error"),
        )

    def retry_decision(self, *, status_code: int | None = None, error: str | None = None, attempts: int = 0) -> dict[str, Any]:
        retryable = (status_code in self.retryable_statuses) or (status_code is None and bool(error))
        exhausted = attempts >= 5
        delay_seconds = min(300, 2 ** max(attempts, 0))
        return {
            "retryable": retryable and not exhausted,
            "exhausted": exhausted,
            "delay_seconds": delay_seconds if retryable and not exhausted else 0,
            "next_attempt_at": (_now_dt() + timedelta(seconds=delay_seconds)).isoformat() if retryable and not exhausted else None,
            "reason": error or (f"HTTP {status_code}" if status_code else "unknown"),
        }

    def mark_attempt(self, item: OperationalQueueItem, *, status_code: int | None = None, error: str | None = None, conn: Any | None = None) -> OperationalQueueItem:
        attempts = item.attempts + 1
        decision = self.retry_decision(status_code=status_code, error=error, attempts=attempts)
        status = "retrying" if decision["retryable"] else "failed" if decision["exhausted"] or error else "completed"
        updated = OperationalQueueItem(
            queue_id=item.queue_id,
            operation_type=item.operation_type,
            payload=item.payload,
            idempotency_key=item.idempotency_key,
            scope=item.scope,
            status=status,
            attempts=attempts,
            max_attempts=item.max_attempts,
            created_at=item.created_at,
            next_attempt_at=decision["next_attempt_at"] or _now(),
            last_error=error or decision["reason"],
        )
        self._memory[item.queue_id] = updated
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE operational_queue_items
                    SET status=%s, attempts=%s, next_attempt_at=%s, last_error=%s,
                        locked_by=NULL, locked_at=NULL, updated_at=NOW()
                    WHERE queue_id=%s
                    """,
                    (updated.status, updated.attempts, updated.next_attempt_at, updated.last_error, updated.queue_id),
                )
        return updated

    def claim_due(
        self,
        conn: Any,
        *,
        worker_id: str,
        operation_types: list[str] | None = None,
        limit: int = 25,
    ) -> list[OperationalQueueItem]:
        params: list[Any] = [worker_id]
        where = "status IN ('queued', 'retrying') AND next_attempt_at <= NOW()"
        if operation_types:
            where += " AND operation_type = ANY(%s)"
            params.append(operation_types)
        params.append(max(1, min(limit, 250)))
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE operational_queue_items
                SET status='processing', locked_by=%s, locked_at=NOW(), updated_at=NOW()
                WHERE queue_id IN (
                    SELECT queue_id FROM operational_queue_items
                    WHERE {where}
                    ORDER BY next_attempt_at ASC, created_at ASC
                    LIMIT %s
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING queue_id, operation_type, scope, payload, idempotency_key,
                          status, attempts, max_attempts, created_at, next_attempt_at, last_error
                """,
                tuple(params),
            )
            return [self.from_row(row) for row in cur.fetchall() or []]

    def health(self, conn: Any | None = None) -> dict[str, Any]:
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute("SELECT status, COUNT(*) AS count FROM operational_queue_items GROUP BY status")
                rows = cur.fetchall() or []
            counts = {str(row["status"] if isinstance(row, dict) else row[0]): int(row["count"] if isinstance(row, dict) else row[1]) for row in rows}
        else:
            counts = dict(Counter(item.status for item in self._memory.values()))
        queued = counts.get("queued", 0) + counts.get("retrying", 0)
        return {
            "ok": counts.get("failed", 0) == 0,
            "queued": queued,
            "processing": counts.get("processing", 0),
            "failed": counts.get("failed", 0),
            "completed": counts.get("completed", 0),
            "backpressure": queued > 100,
        }


operational_queue_service = OperationalQueueService()
