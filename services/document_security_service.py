from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from schemas.data_protection import DataClassification, DocumentSecurityResult
from services.audit_event_service import record_audit_event
from services.data_classification_service import classify_document_type


ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp", ".txt"}
EXECUTABLE_EXTENSIONS = {".html", ".htm", ".js", ".svg", ".exe", ".bat", ".cmd", ".sh", ".php"}
DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def max_upload_bytes() -> int:
    try:
        return int(os.getenv("DOCUMENT_MAX_UPLOAD_BYTES", str(DEFAULT_MAX_UPLOAD_BYTES)))
    except Exception:
        return DEFAULT_MAX_UPLOAD_BYTES


def safe_filename(original_name: str | None) -> str:
    raw_name = Path(original_name or "document").name
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", Path(raw_name).stem).strip("._")[:80] or "document"
    suffix = Path(raw_name).suffix.lower()
    return f"{stem}_{uuid4().hex}{suffix}"


class DocumentSecurityService:
    def validate_upload(
        self,
        upload: UploadFile,
        *,
        document_type: str | None = None,
        current_user: dict[str, Any] | None = None,
    ) -> DocumentSecurityResult:
        original_name = upload.filename or "document"
        suffix = Path(original_name).suffix.lower()
        classification = classify_document_type(document_type, title=original_name)

        if suffix in EXECUTABLE_EXTENSIONS or suffix not in ALLOWED_EXTENSIONS:
            self.audit("document_upload_blocked", current_user=current_user, outcome="blocked", metadata={"reason": "unsupported_extension", "extension": suffix})
            raise HTTPException(status_code=415, detail="Unsupported or unsafe document type")

        safe_name = safe_filename(original_name)
        return DocumentSecurityResult(
            allowed=True,
            reason="validated",
            classification=classification,
            safe_filename=safe_name,
            max_size_bytes=max_upload_bytes(),
        )

    def validate_path_under_root(self, root: Path, target: Path) -> Path:
        root_resolved = root.resolve()
        target_resolved = target.resolve()
        if root_resolved != target_resolved and root_resolved not in target_resolved.parents:
            raise HTTPException(status_code=404, detail="Document not found")
        return target_resolved

    def enforce_download_access(
        self,
        *,
        row: dict[str, Any],
        current_user: dict[str, Any],
    ) -> None:
        if not scope_matches(current_user, row):
            self.audit("document_download_denied", current_user=current_user, outcome="denied", metadata={"document_id": row.get("id")})
            raise HTTPException(status_code=403, detail="You do not have access to this document")

    def audit(self, action: str, *, current_user: dict[str, Any] | None, outcome: str, metadata: dict[str, Any] | None = None) -> None:
        record_audit_event(
            event_type="document.security",
            action=action,
            outcome=outcome,
            actor=current_user or {},
            resource_type="document",
            metadata=metadata or {},
        )


def scope_matches(current_user: dict[str, Any], row: dict[str, Any]) -> bool:
    role = str(current_user.get("role") or "").strip().lower()
    user_provider_id = _safe_int(current_user.get("provider_id") or current_user.get("providerId"))
    row_provider_id = _safe_int(row.get("provider_id"))
    if row_provider_id is not None and user_provider_id is not None and row_provider_id != user_provider_id and role not in {"admin", "super_admin", "superadmin", "founder", "owner"}:
        return False

    row_home_id = _safe_int(row.get("home_id"))
    if row_home_id is None:
        return row_provider_id is None or user_provider_id is not None

    allowed = _allowed_home_ids(current_user)
    provider_roles = {"admin", "super_admin", "superadmin", "founder", "owner", "provider_admin", "responsible_individual", "ri"}
    if role in provider_roles:
        return user_provider_id is None or row_provider_id is None or user_provider_id == row_provider_id or role in {"admin", "super_admin", "superadmin", "founder", "owner"}
    return row_home_id in allowed


def _allowed_home_ids(current_user: dict[str, Any]) -> set[int]:
    raw = current_user.get("allowed_home_ids") or current_user.get("allowedHomeIds") or current_user.get("home_ids") or []
    values = raw if isinstance(raw, (list, tuple, set)) else [raw]
    result = {_safe_int(item) for item in values}
    result.add(_safe_int(current_user.get("home_id") or current_user.get("homeId")))
    return {item for item in result if item is not None}


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except Exception:
        return None


document_security_service = DocumentSecurityService()
