from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4


class LifeEchoUploadService:
    """Builds upload metadata for emotional memory media."""

    @staticmethod
    def create_upload(
        *,
        child_id: str,
        filename: str,
        media_type: str,
    ) -> dict:
        upload_id = f"upload_{uuid4().hex}"

        return {
            "upload_id": upload_id,
            "child_id": child_id,
            "filename": filename,
            "media_type": media_type,
            "upload_url": f"/api/life-echo/media/{upload_id}",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
