from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from auth.current_user import get_current_user
from db.connection import get_db
from services.referral_matching_service import ReferralMatchingService
from services.referral_upload_service import ReferralUploadService
from services.workflow_response import gold_standard_response

router = APIRouter(prefix="/referrals", tags=["Referral Uploads"])


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
    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Referral document is too large. Maximum size is 15MB.")

    extraction = ReferralUploadService.extract_text_from_bytes(
        content=content,
        filename=file.filename,
        content_type=file.content_type,
    )
    payload = {
        "document_type": document_type,
        "title": title or file.filename or "Referral document",
        "file_name": file.filename,
        "file_type": file.content_type,
        "extracted_text": extraction.get("extracted_text") or "",
        "extracted_metadata": {
            "upload_mode": "multipart",
            "file_name": file.filename,
            "file_type": file.content_type,
            "file_size": len(content),
            "extraction": extraction,
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
        workflow={"extraction_status": item.get("extraction_status"), "upload_status": extraction.get("extraction_status")},
        sync={"attempted": False, "reason": "referral_upload_pre_placement"},
        referral_document=item,
    )
