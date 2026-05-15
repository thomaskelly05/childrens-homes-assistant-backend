from __future__ import annotations

from typing import Any

from services.operational_metrics_service import operational_metrics_service
from services.operational_queue_service import OperationalQueueItem, operational_queue_service


class RetryReconciliationService:
    """Claims due work and applies backpressure-aware retry outcomes."""

    def claim_due_work(
        self,
        conn: Any,
        *,
        worker_id: str,
        operation_types: list[str] | None = None,
        limit: int = 25,
    ) -> dict[str, Any]:
        health = operational_queue_service.health(conn)
        if health["backpressure"]:
            limit = max(1, min(limit, 10))
        items = operational_queue_service.claim_due(conn, worker_id=worker_id, operation_types=operation_types, limit=limit)
        operational_metrics_service.increment("queue.claimed", value=len(items), dimensions={"worker_id": worker_id}, conn=conn)
        return {
            "ok": True,
            "claimed": [self._serialise(item) for item in items],
            "backpressure": health["backpressure"],
            "queue_health": health,
        }

    def reconcile_result(
        self,
        item: OperationalQueueItem,
        *,
        conn: Any | None = None,
        status_code: int | None = None,
        error: str | None = None,
    ) -> dict[str, Any]:
        updated = operational_queue_service.mark_attempt(item, status_code=status_code, error=error, conn=conn)
        metric = "queue.completed" if updated.status == "completed" else "queue.retrying" if updated.status == "retrying" else "queue.failed"
        operational_metrics_service.increment(metric, dimensions={"operation_type": item.operation_type}, conn=conn)
        return {"ok": updated.status == "completed", "item": self._serialise(updated)}

    def _serialise(self, item: OperationalQueueItem) -> dict[str, Any]:
        return {
            "queue_id": item.queue_id,
            "operation_type": item.operation_type,
            "scope": item.scope,
            "status": item.status,
            "attempts": item.attempts,
            "next_attempt_at": item.next_attempt_at,
            "last_error": item.last_error,
        }


retry_reconciliation_service = RetryReconciliationService()
