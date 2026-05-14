from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any


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
    status: str = "queued"
    attempts: int = 0
    max_attempts: int = 5
    created_at: str = field(default_factory=_now)
    next_attempt_at: str = field(default_factory=_now)
    last_error: str | None = None


class OperationalQueueService:
    """Idempotent retry planning for saves, uploads, exports and writebacks."""

    retryable_statuses = {408, 409, 425, 429, 500, 502, 503, 504}

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
    ) -> OperationalQueueItem:
        key = self.idempotency_key(operation_type=operation_type, scope=scope, client_token=client_token)
        return OperationalQueueItem(
            queue_id=hashlib.sha1(key.encode("utf-8")).hexdigest(),
            operation_type=operation_type,
            payload=payload,
            idempotency_key=key,
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

    def mark_attempt(self, item: OperationalQueueItem, *, status_code: int | None = None, error: str | None = None) -> OperationalQueueItem:
        attempts = item.attempts + 1
        decision = self.retry_decision(status_code=status_code, error=error, attempts=attempts)
        status = "retrying" if decision["retryable"] else "failed" if decision["exhausted"] or error else "completed"
        return OperationalQueueItem(
            queue_id=item.queue_id,
            operation_type=item.operation_type,
            payload=item.payload,
            idempotency_key=item.idempotency_key,
            status=status,
            attempts=attempts,
            max_attempts=item.max_attempts,
            created_at=item.created_at,
            next_attempt_at=decision["next_attempt_at"] or _now(),
            last_error=error or decision["reason"],
        )


operational_queue_service = OperationalQueueService()
