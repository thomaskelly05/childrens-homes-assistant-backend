from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from psycopg2.extras import Json

from services.operational_metrics_service import operational_metrics_service
from services.operational_queue_service import operational_queue_service


def _now() -> datetime:
    return datetime.now(timezone.utc)


class UploadProcessingService:
    """Signed upload planning and durable processing queue registration."""

    processing_steps = ["virus_scan", "metadata_extract", "document_intelligence", "retention_policy", "route_or_review"]

    def signed_upload(
        self,
        *,
        file_name: str,
        content_type: str,
        scope: str,
        requested_by: int | str | None,
        metadata: dict[str, Any] | None = None,
        client_token: str | None = None,
        conn: Any | None = None,
    ) -> dict[str, Any]:
        retention_until = _now() + timedelta(days=int(os.getenv("UPLOAD_RETENTION_DAYS", "90")))
        item = operational_queue_service.queue_item(
            operation_type="upload_processing",
            payload={"file_name": file_name, "content_type": content_type, "requested_by": requested_by, "metadata": metadata or {}},
            scope=scope,
            client_token=client_token,
            conn=conn,
        )
        upload_id = item.queue_id
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO upload_processing_jobs (
                        upload_id, queue_id, scope, file_name, content_type,
                        status, retention_until, metadata, processing_state
                    )
                    VALUES (%s, %s, %s, %s, %s, 'queued', %s, %s, %s)
                    ON CONFLICT (upload_id) DO UPDATE SET
                        metadata = EXCLUDED.metadata,
                        updated_at = NOW()
                    """,
                    (
                        upload_id,
                        item.queue_id,
                        scope,
                        file_name,
                        content_type,
                        retention_until.isoformat(),
                        Json(metadata or {}),
                        Json({"steps": self.processing_steps, "current_step": "queued"}),
                    ),
                )
        operational_metrics_service.increment("queue.upload.queued", dimensions={"scope": scope})
        return {
            "ok": True,
            "upload_id": upload_id,
            "queue_id": item.queue_id,
            "status": "queued",
            "retention_until": retention_until.isoformat(),
            "signed_upload": self._signed_policy(upload_id=upload_id, file_name=file_name, content_type=content_type, scope=scope),
            "processing_steps": self.processing_steps,
        }

    def mark_processed(self, *, upload_id: str, status: str, conn: Any | None = None, error: str | None = None) -> dict[str, Any]:
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE upload_processing_jobs
                    SET status=%s, processing_state = processing_state || %s::jsonb, updated_at=NOW()
                    WHERE upload_id=%s
                    """,
                    (status, Json({"completed_at": _now().isoformat(), "error": error}), upload_id),
                )
        metric = "upload.failure" if status == "failed" else "upload.processed"
        operational_metrics_service.increment(metric, dimensions={"status": status})
        return {"ok": status != "failed", "upload_id": upload_id, "status": status, "error": error}

    def _signed_policy(self, *, upload_id: str, file_name: str, content_type: str, scope: str) -> dict[str, Any]:
        base_url = os.getenv("SIGNED_UPLOAD_BASE_URL")
        expires_at = _now() + timedelta(minutes=15)
        secret = os.getenv("SIGNED_UPLOAD_SECRET") or os.getenv("SESSION_SECRET_KEY") or "local-dev-only"
        payload = f"{upload_id}:{scope}:{file_name}:{content_type}:{int(expires_at.timestamp())}"
        signature = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not base_url:
            return {
                "available": False,
                "limitation": "Signed upload endpoint is not configured; queue entry was created but no upload URL was issued.",
                "expires_at": expires_at.isoformat(),
            }
        return {
            "available": True,
            "method": "PUT",
            "url": f"{base_url.rstrip('/')}/{upload_id}",
            "headers": {"content-type": content_type, "x-indicare-upload-signature": signature},
            "expires_at": expires_at.isoformat(),
        }


upload_processing_service = UploadProcessingService()
