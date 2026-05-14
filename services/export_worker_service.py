from __future__ import annotations

from typing import Any

from services.operational_queue_service import operational_queue_service


class ExportWorkerService:
    """Export worker planning that avoids silent or duplicate exports."""

    def plan_export(self, *, export_type: str, scope: str, requested_by: int | None, payload: dict[str, Any], client_token: str | None = None) -> dict[str, Any]:
        item = operational_queue_service.queue_item(
            operation_type=f"export:{export_type}",
            payload={**payload, "requested_by": requested_by},
            scope=scope,
            client_token=client_token,
        )
        return {
            "queue_id": item.queue_id,
            "idempotency_key": item.idempotency_key,
            "status": "queued",
            "approval_required": export_type in {"reg45", "safeguarding", "child_record"},
            "audit": {
                "requested_by": requested_by,
                "scope": scope,
                "export_type": export_type,
            },
        }


export_worker_service = ExportWorkerService()
