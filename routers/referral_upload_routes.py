from __future__ import annotations

import re
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from auth.current_user import get_current_user
from db.connection import get_db
from services.referral_matching_service import ReferralMatchingService
from services.workflow_response import gold_standard_response

router = APIRouter(prefix="/referrals", tags=["Referral Document Upload"])

UPLOAD_ROOT = Path("uploads/referrals")
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
TEXT_MIME_TYPES = {
    "text/plain",
    "text/csv",
    "text/markdown",
    "application/json",
    "application/xml",
    "text/xml",
    "text/html",
}


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except Exception:
        return None


def _actor_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("id") or current_user.get("user_id") or current_user.get("sub"))


def _role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _assert_manager(current_user: dict[str, Any]) -> None:
    if _role(current_user) not in {"admin", "provider_admin", "manager", "registered_manager"}:
        raise HTTPException(status_code=403, detail="You do not have permission to upload referral documents")


def _safe_name(filename: str | None) -> str:
    base = Path(filename or "referral-document").name
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip(".-")
    return cleaned or "referral-document"


def _decode_text_bytes(data: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return data.decode(encoding, errors="ignore")
        except Exception:
            continue
    return ""


def _extract_text(filename: str, content_type: str | None, data: bytes) -> tuple[str, str]:
    suffix = Path(filename).suffix.lower()
    mime = str(content_type or "").lower()

    if mime in TEXT_MIME_TYPES or suffix in {".txt", ".md", ".csv", ".json", ".xml", ".html", ".htm"}:
        return _decode_text_bytes(data), "text_decoded"

    if suffix == ".pdf" or mime == "application/pdf":
        decoded = _decode_text_bytes(data)
        # Lightweight fallback only: pulls readable fragments from PDFs.
        # Full OCR/parser integration should replace this in the next hardening pass.
        fragments = re.findall(r"[A-Za-z0-9 ,.;:'\"!?()/%\-]{24,}", decoded)
        return "\n".join(fragments[:800]), "pdf_lightweight_fallback"

    return "", "unsupported_binary_saved_only"


@router.post("/{referral_id}/documents/upload")
async def upload_referral_document(
    referral_id: int,
    file: UploadFile = File(...),
    document_type: str = Form(default="referral_document"),
    title: str | None = Form(default=None),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    _assert_manager(current_user)

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Referral document is too large")

    safe_name = _safe_name(file.filename)
    referral_dir = UPLOAD_ROOT / str(referral_id)
    referral_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}-{safe_name}"
    stored_path = referral_dir / stored_name
    stored_path.write_bytes(data)

    extracted_text, extraction_method = _extract_text(safe_name, file.content_type, data)
    payload = {
        "document_type": document_type or "referral_document",
        "title": title or safe_name,
        "file_name": safe_name,
        "file_url": f"/{stored_path.as_posix()}",
        "file_type": file.content_type or Path(safe_name).suffix.lower().lstrip(".") or "unknown",
        "extracted_text": extracted_text,
        "extracted_metadata": {
            "upload_path": stored_path.as_posix(),
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size_bytes": len(data),
            "extraction_method": extraction_method,
            "requires_manual_review": extraction_method in {"pdf_lightweight_fallback", "unsupported_binary_saved_only"},
        },
    }
    item = ReferralMatchingService.add_document(
        conn,
        referral_id=referral_id,
        payload=payload,
        actor_user_id=_actor_id(current_user),
    )
    return gold_standard_response(
        id=item.get("id"),
        item=item,
        message="Referral document uploaded and scanned",
        workflow={"extraction_status": item.get("extraction_status"), "method": extraction_method},
        sync={"attempted": False, "reason": "pre_placement_referral_upload"},
        referral_document=item,
    )
