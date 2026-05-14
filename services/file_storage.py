from __future__ import annotations

import os
from pathlib import Path
from typing import BinaryIO
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from services.document_security_service import document_security_service, max_upload_bytes


ALLOWED_DOCUMENT_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/plain",
}


class LocalDocumentStorage:
    """Small storage abstraction so later S3/Azure adapters can keep the same contract."""

    def __init__(self, root: str | None = None) -> None:
        self.root = Path(root or os.getenv("INDICARE_DOCUMENT_STORAGE_ROOT", "/tmp/indicare-os/documents"))

    def validate_upload(self, upload: UploadFile) -> None:
        content_type = upload.content_type or "application/octet-stream"
        if content_type not in ALLOWED_DOCUMENT_MIME_TYPES:
            raise HTTPException(status_code=415, detail=f"Unsupported document type: {content_type}")

    async def save_upload(self, upload: UploadFile, *, home_id: int | None = None) -> dict[str, object]:
        self.validate_upload(upload)
        security = document_security_service.validate_upload(upload)
        bucket = str(home_id or "shared")
        target_dir = self.root / bucket
        target_dir.mkdir(parents=True, exist_ok=True)

        original_name = Path(upload.filename or "document").name
        suffix = Path(security.safe_filename or original_name).suffix.lower()
        stored_name = f"{uuid4().hex}{suffix}"
        target_path = target_dir / stored_name

        size = 0
        with target_path.open("wb") as handle:
            while chunk := await upload.read(1024 * 1024):
                size += len(chunk)
                if size > max_upload_bytes():
                    handle.close()
                    target_path.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="Uploaded document is too large")
                handle.write(chunk)

        return {
            "storage_backend": "local",
            "storage_path": str(target_path),
            "file_url": f"/os/documents/uploads/{bucket}/{stored_name}",
            "file_name": original_name,
            "stored_name": stored_name,
            "mime_type": upload.content_type,
            "file_size_bytes": size,
            "classification": security.classification.value,
        }


def storage_from_env() -> LocalDocumentStorage:
    return LocalDocumentStorage()
