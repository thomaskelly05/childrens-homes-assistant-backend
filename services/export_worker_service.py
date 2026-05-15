from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from psycopg2.extras import Json

from services.operational_metrics_service import operational_metrics_service
from services.operational_queue_service import operational_queue_service


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ExportWorkerService:
    """Durable export queue registration that avoids silent or duplicate exports."""

    def plan_export(
        self,
        *,
        export_type: str,
        scope: str,
        requested_by: int | None,
        payload: dict[str, Any],
        client_token: str | None = None,
        conn: Any | None = None,
    ) -> dict[str, Any]:
        item = operational_queue_service.queue_item(
            operation_type=f"export:{export_type}",
            payload={**payload, "requested_by": requested_by},
            scope=scope,
            client_token=client_token,
            conn=conn,
        )
        export_id = item.queue_id
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO export_processing_jobs (
                        export_id, queue_id, export_type, scope, requested_by, status, payload
                    )
                    VALUES (%s, %s, %s, %s, %s, 'queued', %s)
                    ON CONFLICT (export_id) DO UPDATE SET
                        payload=EXCLUDED.payload,
                        updated_at=NOW()
                    """,
                    (export_id, item.queue_id, export_type, scope, requested_by, Json(payload)),
                )
        operational_metrics_service.increment("export.queued", dimensions={"export_type": export_type, "scope": scope}, conn=conn)
        return {
            "export_id": export_id,
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

    def mark_result(
        self,
        *,
        export_id: str,
        status: str,
        artifact: dict[str, Any] | None = None,
        error: str | None = None,
        conn: Any | None = None,
    ) -> dict[str, Any]:
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE export_processing_jobs
                    SET status=%s, artifact=%s, error=%s, updated_at=NOW()
                    WHERE export_id=%s
                    """,
                    (status, Json(artifact or {}), error, export_id),
                )
        operational_metrics_service.increment("export.failure" if status == "failed" else "export.completed", dimensions={"status": status}, conn=conn)
        return {"ok": status != "failed", "export_id": export_id, "status": status, "artifact": artifact or {}, "error": error, "updated_at": _now()}

    def health(self, conn: Any | None = None) -> dict[str, Any]:
        if conn is None:
            queue_health = operational_queue_service.health()
            return {"ok": queue_health["failed"] == 0, "queue": queue_health, "exports": {}}
        with conn.cursor() as cur:
            cur.execute("SELECT status, COUNT(*) AS count FROM export_processing_jobs GROUP BY status")
            rows = cur.fetchall() or []
        counts = {str(row["status"] if isinstance(row, dict) else row[0]): int(row["count"] if isinstance(row, dict) else row[1]) for row in rows}
        return {"ok": counts.get("failed", 0) == 0, "queue": operational_queue_service.health(conn), "exports": counts}


export_worker_service = ExportWorkerService()
