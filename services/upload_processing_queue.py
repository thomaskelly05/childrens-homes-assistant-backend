from __future__ import annotations

from typing import Any

from services.operational_queue_service import operational_queue_service


class UploadProcessingQueue:
    """Reliable upload queue plan with idempotency and retry metadata."""

    def plan_upload(self, *, file_name: str, scope: str, metadata: dict[str, Any] | None = None, client_token: str | None = None) -> dict[str, Any]:
        item = operational_queue_service.queue_item(
            operation_type="upload_processing",
            payload={"file_name": file_name, "metadata": metadata or {}},
            scope=scope,
            client_token=client_token,
        )
        return {
            "queue_id": item.queue_id,
            "idempotency_key": item.idempotency_key,
            "status": item.status,
            "steps": ["virus_scan", "metadata_extract", "document_intelligence", "route_or_review"],
            "retry_policy": {"max_attempts": item.max_attempts, "retryable": True},
        }


upload_processing_queue = UploadProcessingQueue()
